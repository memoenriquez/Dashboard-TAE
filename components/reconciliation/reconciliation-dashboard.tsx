"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileTextIcon,
  PlayIcon,
  RefreshCwIcon,
  SaveIcon,
  ServerIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { readApiErrorMessage } from "@/lib/api/client-error"

interface ClientRecord {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "parent" | "child" | "standalone"
  isActive: boolean
}

interface ReconciliationConfigRecord {
  id: string
  ownerClientId: string
  isEnabled: boolean
  reconciliationUsername: string
  cutoffTimezone: string
  filenameTimeDifference: string
  sftpEnabled: boolean
  sftpHost: string | null
  sftpPort: number
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
}

interface ReconciliationRunRecord {
  id: string
  ownerClientId: string
  reconciledDate: string
  filename: string | null
  status: "generated" | "sent" | "send_failed" | "generation_failed"
  transactionCount: number
  totalAmount: number
  fileDeletedAt: string | null
  lastSendError?: string | null
  internalError?: string | null
}

const timezones = [
  "America/Mexico_City",
  "America/Chihuahua",
  "America/Tijuana",
  "America/Cancun",
  "America/Hermosillo",
  "America/Mazatlan",
]

export function ReconciliationDashboard() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [configs, setConfigs] = useState<ReconciliationConfigRecord[]>([])
  const [runs, setRuns] = useState<ReconciliationRunRecord[]>([])
  const [isInternalAdmin, setIsInternalAdmin] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const selectedClientIdRef = useRef("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generationDate, setGenerationDate] = useState(getYesterdayDate)
  const [generationDateBounds] = useState(getGenerationDateBounds)
  const [form, setForm] = useState(getConfigForm)
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0]
  const selectedConfig = selectedClient
    ? configs.find((config) => config.ownerClientId === selectedClient.id)
    : null
  const selectedRuns = selectedClient
    ? runs.filter((run) => run.ownerClientId === selectedClient.id)
    : []
  const hasConfig = Boolean(selectedConfig)
  const failedRuns = selectedRuns.filter(
    (run) => run.status === "generation_failed" || run.status === "send_failed"
  )

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reconciliations")
      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible cargar conciliaciones."))
        return
      }
      const payload = (await response.json()) as {
        clients: ClientRecord[]
        configs: ReconciliationConfigRecord[]
        runs: ReconciliationRunRecord[]
        isInternalAdmin: boolean
      }
      const configurableClients = payload.clients.filter((client) => client.clientKind !== "child")
      const nextClientId = selectedClientIdRef.current || configurableClients[0]?.id || ""
      setClients(configurableClients)
      setConfigs(payload.configs)
      setRuns(payload.runs)
      setIsInternalAdmin(payload.isInternalAdmin)
      selectedClientIdRef.current = nextClientId
      setSelectedClientId(nextClientId)
      setForm(getConfigForm(payload.configs.find((config) => config.ownerClientId === nextClientId)))
    } catch {
      toast.error("No fue posible cargar conciliaciones en este momento.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [loadData])

  const saveConfig = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedClient) {
      return
    }
    setIsSubmitting(true)
    const toastId = toast.loading(hasConfig ? "Actualizando conciliación..." : "Creando conciliación...")
    try {
      const response = await fetch("/api/reconciliations/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerClientId: selectedClient.id,
          ...form,
          sftpPort: Number(form.sftpPort || 22),
        }),
      })
      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible guardar."), { id: toastId })
        return
      }
      toast.success(hasConfig ? "Conciliación actualizada." : "Conciliación creada.", { id: toastId })
      await loadData()
    } catch {
      toast.error("No fue posible guardar en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateSelectedDate = async () => {
    if (!selectedClient) {
      return
    }
    setIsSubmitting(true)
    const toastId = toast.loading("Generando archivo...")
    try {
      const response = await fetch("/api/reconciliations/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerClientId: selectedClient.id, reconciledDate: generationDate }),
      })
      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible generar."), { id: toastId })
        await loadData()
        return
      }
      const payload = (await response.json()) as { run: ReconciliationRunRecord }
      showRunResultToast(payload.run, toastId, "Archivo generado.")
      await loadData()
    } catch {
      toast.error("No fue posible generar en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const testSftp = async () => {
    if (!selectedClient) {
      return
    }
    setIsSubmitting(true)
    const toastId = toast.loading("Probando conexión SFTP...")
    try {
      const response = await fetch("/api/reconciliations/config/test-sftp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerClientId: selectedClient.id }),
      })

      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible conectar al SFTP."), { id: toastId })
        return
      }

      toast.success("Conexión SFTP exitosa.", { id: toastId })
    } catch {
      toast.error("No fue posible probar SFTP en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const retrySftpSend = async (run: ReconciliationRunRecord) => {
    setIsSubmitting(true)
    const toastId = toast.loading(`${getSftpActionLabel(run.status)}...`)
    try {
      const response = await fetch(`/api/reconciliations/runs/${run.id}/retry-send`, {
        method: "POST",
      })

      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible reenviar."), { id: toastId })
        return
      }

      const payload = (await response.json()) as { run: ReconciliationRunRecord }
      showRunResultToast(payload.run, toastId, "Envío SFTP finalizado.")
      await loadData()
    } catch {
      toast.error("No fue posible reintentar el envío en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoading && clients.length === 0) {
    return (
      <Empty className="min-h-[360px] border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
          <EmptyTitle>Sin cuentas conciliables</EmptyTitle>
          <EmptyDescription>
            La conciliación se configura para clientes padre o independientes. Los clientes asociados se incluyen dentro de su padre.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Conciliación TAE</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Genera archivos TXT diarios por cliente padre o independiente. Los clientes asociados se concilian dentro de su cliente padre.
        </p>
      </div>

      {isInternalAdmin ? (
        <AdminClientSelector
          clients={clients}
          configs={configs}
          selectedClient={selectedClient}
          onSelect={(clientId) => {
            selectedClientIdRef.current = clientId
            setSelectedClientId(clientId)
            setForm(getConfigForm(configs.find((config) => config.ownerClientId === clientId)))
          }}
        />
      ) : null}

      {failedRuns.length > 0 ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Requiere atención</AlertTitle>
          <AlertDescription>
            Hay {failedRuns.length} ejecución{failedRuns.length === 1 ? "" : "es"} fallida{failedRuns.length === 1 ? "" : "s"} para {selectedClient?.displayName}. Revisa el historial para ver el detalle.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
        {isInternalAdmin ? (
          <AdminConfigCard
            canGenerate={Boolean(selectedConfig?.isEnabled)}
            client={selectedClient}
            config={selectedConfig ?? null}
            form={form}
            generationDate={generationDate}
            generationDateBounds={generationDateBounds}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            onFormChange={setForm}
            onGenerate={generateSelectedDate}
            onGenerationDateChange={setGenerationDate}
            onSubmit={saveConfig}
            onTestSftp={testSftp}
          />
        ) : (
          <ClientSummaryCard client={selectedClient} config={selectedConfig ?? null} />
        )}

        <RunHistoryCard
          client={selectedClient}
          isInternalAdmin={isInternalAdmin}
          isSubmitting={isSubmitting}
          onRetrySend={retrySftpSend}
          runs={selectedRuns}
        />
      </div>
    </div>
  )
}

function AdminClientSelector(props: {
  clients: ClientRecord[]
  configs: ReconciliationConfigRecord[]
  selectedClient?: ClientRecord
  onSelect: (clientId: string) => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Cuenta conciliable</CardTitle>
        <CardDescription>Selecciona un cliente padre o independiente para crear o editar su configuración.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(260px,420px)_1fr]">
        <Select value={props.selectedClient?.id ?? ""} onValueChange={(value) => props.onSelect(value ?? "")}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
          <SelectContent>
            {props.clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.displayName} · {getClientKindLabel(client.clientKind)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {props.selectedClient ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{props.selectedClient.displayName}</span>
            <Badge variant="outline">{getClientKindLabel(props.selectedClient.clientKind)}</Badge>
            <Badge variant={props.configs.some((config) => config.ownerClientId === props.selectedClient?.id) ? "secondary" : "outline"}>
              {props.configs.some((config) => config.ownerClientId === props.selectedClient?.id) ? "Configuración existente" : "Sin configuración"}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AdminConfigCard(props: {
  canGenerate: boolean
  client?: ClientRecord
  config: ReconciliationConfigRecord | null
  form: ConfigFormState
  generationDate: string
  generationDateBounds: { min: string; max: string }
  isLoading: boolean
  isSubmitting: boolean
  onFormChange: (form: ConfigFormState) => void
  onGenerate: () => void
  onGenerationDateChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onTestSftp: () => void
}) {
  const mode = props.config ? "edit" : "create"

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{mode === "edit" ? "Editar configuración" : "Crear configuración"}</CardTitle>
            <CardDescription>
              {props.client ? `${props.client.displayName} · ${getClientKindLabel(props.client.clientKind)}` : "Selecciona un cliente para continuar."}
            </CardDescription>
          </div>
          <Badge variant={props.form.isEnabled ? "secondary" : "outline"}>{props.form.isEnabled ? "Activa" : "Inactiva"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={props.onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Estado</FieldLabel>
              <Select value={props.form.isEnabled ? "true" : "false"} onValueChange={(value) => props.onFormChange({ ...props.form, isEnabled: value === "true" })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Activa</SelectItem><SelectItem value="false">Inactiva</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Usuario conciliación</FieldLabel>
              <Input value={props.form.reconciliationUsername} onChange={(event) => props.onFormChange({ ...props.form, reconciliationUsername: event.target.value })} />
              <FieldDescription>Se usa en el nombre del archivo, no se deriva del nombre del cliente.</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Zona de corte</FieldLabel>
                <Select value={props.form.cutoffTimezone} onValueChange={(value) => props.onFormChange({ ...props.form, cutoffTimezone: value ?? props.form.cutoffTimezone })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Diferencia en nombre</FieldLabel>
                <Input value={props.form.filenameTimeDifference} onChange={(event) => props.onFormChange({ ...props.form, filenameTimeDifference: event.target.value })} />
              </Field>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">SFTP</p>
                  <p className="text-xs text-muted-foreground">La contraseña real vive en Supabase Vault.</p>
                </div>
                <Select value={props.form.sftpEnabled ? "true" : "false"} onValueChange={(value) => props.onFormChange({ ...props.form, sftpEnabled: value === "true" })}>
                  <SelectTrigger className="w-32 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Activo</SelectItem><SelectItem value="false">Inactivo</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel>Host</FieldLabel><Input value={props.form.sftpHost} onChange={(event) => props.onFormChange({ ...props.form, sftpHost: event.target.value })} /></Field>
                <Field><FieldLabel>Puerto</FieldLabel><Input inputMode="numeric" value={props.form.sftpPort} onChange={(event) => props.onFormChange({ ...props.form, sftpPort: event.target.value })} /></Field>
                <Field><FieldLabel>Usuario</FieldLabel><Input value={props.form.sftpUsername} onChange={(event) => props.onFormChange({ ...props.form, sftpUsername: event.target.value })} /></Field>
                <Field><FieldLabel>Ruta remota</FieldLabel><Input value={props.form.sftpRemotePath} onChange={(event) => props.onFormChange({ ...props.form, sftpRemotePath: event.target.value })} /></Field>
                <Field><FieldLabel>Secreto Vault</FieldLabel><Input value={props.form.sftpPasswordSecretName} onChange={(event) => props.onFormChange({ ...props.form, sftpPasswordSecretName: event.target.value })} /></Field>
              </div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <Field>
                <FieldLabel>Generar archivo manual</FieldLabel>
                <Input type="date" max={props.generationDateBounds.max} min={props.generationDateBounds.min} value={props.generationDate} onChange={(event) => props.onGenerationDateChange(event.target.value)} />
                <FieldDescription>Disponible para fechas ya cerradas dentro de los últimos 90 días.</FieldDescription>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isSubmitting || props.isLoading || !props.client}>
                <SaveIcon data-icon="inline-start" /> {mode === "edit" ? "Guardar cambios" : "Crear configuración"}
              </Button>
              <Button type="button" variant="outline" disabled={props.isSubmitting || !props.config} onClick={props.onTestSftp}>
                <ServerIcon data-icon="inline-start" /> Probar SFTP
              </Button>
              <Button type="button" variant="outline" disabled={props.isSubmitting || !props.canGenerate} onClick={props.onGenerate}>
                <PlayIcon data-icon="inline-start" /> Generar fecha
              </Button>
            </div>
            {!props.canGenerate ? <p className="text-sm text-muted-foreground">Activa y guarda la configuración antes de generar archivos.</p> : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function ClientSummaryCard(props: {
  client?: ClientRecord
  config: ReconciliationConfigRecord | null
}) {
  if (!props.client) {
    return null
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>{props.client.displayName}</CardTitle>
        <CardDescription>Estado de conciliación para tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {!props.config ? (
          <Alert>
            <AlertCircleIcon />
            <AlertTitle>Sin configuración activa</AlertTitle>
            <AlertDescription>Operaciones internas aún no ha configurado la conciliación para esta cuenta.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={props.config.isEnabled ? "secondary" : "outline"}>{props.config.isEnabled ? "Activa" : "Inactiva"}</Badge>
              <Badge variant={props.config.sftpEnabled ? "secondary" : "outline"}>SFTP {props.config.sftpEnabled ? "configurado" : "inactivo"}</Badge>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <SummaryItem label="Usuario conciliación" value={props.config.reconciliationUsername} />
              <SummaryItem label="Zona de corte" value={props.config.cutoffTimezone} />
              <SummaryItem label="Diferencia en nombre" value={props.config.filenameTimeDifference} />
              <SummaryItem label="Host SFTP" value={maskValue(props.config.sftpHost)} />
              <SummaryItem label="Usuario SFTP" value={maskValue(props.config.sftpUsername)} />
              <SummaryItem label="Ruta remota" value={props.config.sftpRemotePath ?? "No configurada"} />
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RunHistoryCard(props: {
  client?: ClientRecord
  isInternalAdmin: boolean
  isSubmitting: boolean
  onRetrySend: (run: ReconciliationRunRecord) => void
  runs: ReconciliationRunRecord[]
}) {
  const [selectedErrorRun, setSelectedErrorRun] = useState<ReconciliationRunRecord | null>(null)

  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Historial</CardTitle>
        <CardDescription>{props.client ? `Archivos de ${props.client.displayName}` : "Archivos generados"}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {props.runs.length === 0 ? (
          <Empty className="m-4 border bg-muted/20">
            <EmptyHeader><EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia><EmptyTitle>Sin archivos generados</EmptyTitle><EmptyDescription>Cuando exista una ejecución, aparecerá aquí.</EmptyDescription></EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Archivo</TableHead><TableHead>Estado</TableHead><TableHead>Tx</TableHead><TableHead>Monto</TableHead>{props.isInternalAdmin ? <TableHead>Diagnóstico</TableHead> : null}<TableHead>Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {props.runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.reconciledDate}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{run.filename ?? "No disponible"}</TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell>{run.transactionCount}</TableCell>
                    <TableCell>{formatCurrency(run.totalAmount)}</TableCell>
                    {props.isInternalAdmin ? (
                      <TableCell>
                        {getRunError(run) ? (
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => setSelectedErrorRun(run)}
                          >
                            <AlertCircleIcon data-icon="inline-start" /> Ver error
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {run.filename && !run.fileDeletedAt ? <Button size="sm" variant="outline" render={<a href={`/api/reconciliations/runs/${run.id}/download`}><DownloadIcon data-icon="inline-start" /> Descargar</a>} /> : <span className="text-xs text-muted-foreground">No disponible</span>}
                        {props.isInternalAdmin && run.filename && !run.fileDeletedAt && (run.status === "generated" || run.status === "sent" || run.status === "send_failed") ? (
                          <Button size="sm" type="button" variant="outline" disabled={props.isSubmitting} onClick={() => props.onRetrySend(run)}>
                            <RefreshCwIcon data-icon="inline-start" /> {getSftpActionLabel(run.status)}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <Sheet open={Boolean(selectedErrorRun)} onOpenChange={(open) => !open && setSelectedErrorRun(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Error interno</SheetTitle>
            <SheetDescription>
              {selectedErrorRun
                ? `Conciliación ${selectedErrorRun.reconciledDate}`
                : "Detalle de conciliación"}
            </SheetDescription>
          </SheetHeader>
          {selectedErrorRun ? (
            <div className="space-y-4 px-4 pb-4">
              <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
                <SummaryItem label="Estado" value={getStatusLabel(selectedErrorRun.status)} />
                <SummaryItem label="Archivo" value={selectedErrorRun.filename ?? "No disponible"} />
              </div>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-3 text-xs leading-relaxed text-foreground">
                {getRunError(selectedErrorRun)}
              </pre>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
}

function StatusBadge({ status }: { status: ReconciliationRunRecord["status"] }) {
  if (status === "generated" || status === "sent") {
    return <Badge variant="secondary"><CheckCircle2Icon data-icon="inline-start" />{getStatusLabel(status)}</Badge>
  }

  return <Badge variant="destructive"><AlertCircleIcon data-icon="inline-start" />{getStatusLabel(status)}</Badge>
}

type ConfigFormState = ReturnType<typeof getConfigForm>

const getClientKindLabel = (clientKind: ClientRecord["clientKind"]) => {
  if (clientKind === "parent") {
    return "Padre"
  }
  if (clientKind === "standalone") {
    return "Independiente"
  }
  return "Asociado"
}

const getStatusLabel = (status: ReconciliationRunRecord["status"]) => {
  if (status === "generated") {
    return "Generado"
  }
  if (status === "sent") {
    return "Enviado"
  }
  if (status === "send_failed") {
    return "Falló envío"
  }
  return "Falló generación"
}

const getSftpActionLabel = (status: ReconciliationRunRecord["status"]) => {
  if (status === "generated") {
    return "Enviar a SFTP"
  }
  if (status === "sent") {
    return "Reenviar a SFTP"
  }
  return "Reintentar SFTP"
}

const getRunError = (run: ReconciliationRunRecord) => run.internalError || run.lastSendError || null

const showRunResultToast = (run: ReconciliationRunRecord, toastId: string | number, fallback: string) => {
  if (run.status === "sent") {
    toast.success("Archivo generado y enviado a SFTP.", { id: toastId })
    return
  }

  if (run.status === "send_failed") {
    toast.error(`Archivo generado, pero falló el envío SFTP: ${run.lastSendError ?? "revisa el detalle."}`, { id: toastId })
    return
  }

  if (run.status === "generation_failed") {
    toast.error(`Falló la generación: ${run.internalError ?? "revisa el detalle."}`, { id: toastId })
    return
  }

  toast.success(fallback, { id: toastId })
}

const maskValue = (value: string | null) => {
  if (!value) {
    return "No configurado"
  }
  if (value.length <= 4) {
    return "****"
  }
  return `${value.slice(0, 2)}${"*".repeat(Math.min(value.length - 4, 8))}${value.slice(-2)}`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(value)

const getConfigForm = (config?: ReconciliationConfigRecord) => ({
  isEnabled: config?.isEnabled ?? false,
  reconciliationUsername: config?.reconciliationUsername ?? "",
  cutoffTimezone: config?.cutoffTimezone ?? "America/Mexico_City",
  filenameTimeDifference: config?.filenameTimeDifference ?? "-1",
  sftpEnabled: config?.sftpEnabled ?? false,
  sftpHost: config?.sftpHost ?? "",
  sftpPort: String(config?.sftpPort ?? 22),
  sftpUsername: config?.sftpUsername ?? "",
  sftpRemotePath: config?.sftpRemotePath ?? "",
  sftpPasswordSecretName: config?.sftpPasswordSecretName ?? "",
})

const getYesterdayDate = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

const getGenerationDateBounds = () => ({
  max: getYesterdayDate(),
  min: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10),
})
