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
import { MEXICAN_TIMEZONES } from "@/features/reconciliation/types"
import { readApiErrorMessage } from "@/lib/api/client-error"

interface ClientRecord {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "parent" | "child" | "standalone"
  isActive: boolean
  parentClientId?: string | null
}

interface ReconciliationConfigRecord {
  id: string
  ownerClientId: string
  isEnabled: boolean
  reconciliationUsername: string | null
  cutoffTimezone: string
  filenameTimeDifference: string
  filenameDateFormat: "ddmmaaaa" | "aaaammdd"
  contentDateFormat: "ddmmaaaa" | "aaaammdd"
  deliveryProtocol: "sftp" | "ftp"
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
  subjectClientId: string
  reconciledDate: string
  filename: string | null
  status: "generated" | "sent" | "send_failed" | "generation_failed"
  transactionCount: number
  totalAmount: number
  fileDeletedAt: string | null
  lastSendError?: string | null
  internalError?: string | null
}

interface ReconciliationChildConfigRecord {
  id: string
  configId: string
  childClientId: string
  reconciliationUsername: string
}

export function ReconciliationDashboard() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [configs, setConfigs] = useState<ReconciliationConfigRecord[]>([])
  const [childConfigs, setChildConfigs] = useState<ReconciliationChildConfigRecord[]>([])
  const [runs, setRuns] = useState<ReconciliationRunRecord[]>([])
  const [isInternalAdmin, setIsInternalAdmin] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const selectedClientIdRef = useRef("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dismissedExceptionIds, setDismissedExceptionIds] = useState<string[]>([])
  const [showAllExceptions, setShowAllExceptions] = useState(false)
  const [generationDate, setGenerationDate] = useState(getYesterdayDate)
  const [generationDateBounds] = useState(getGenerationDateBounds)
  const [form, setForm] = useState(getConfigForm)
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0]
  const selectedConfig = selectedClient
    ? configs.find((config) => config.ownerClientId === selectedClient.id)
    : null
  const selectedChildClients = selectedClient?.clientKind === "parent"
    ? clients.filter((client) => client.parentClientId === selectedClient.id && client.isActive && client.externalClientId !== null)
    : []
  const selectedChildConfigs = selectedConfig
    ? childConfigs.filter((childConfig) => childConfig.configId === selectedConfig.id)
    : []
  const selectedRuns = selectedClient
    ? runs.filter((run) => run.ownerClientId === selectedClient.id)
    : []
  const hasConfig = Boolean(selectedConfig)
  const exceptionRuns = getExceptionRuns(runs, configs).filter(
    (run) => !dismissedExceptionIds.includes(run.id)
  )
  const dismissedExceptionCount = getExceptionRuns(runs, configs).length - exceptionRuns.length

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
        childConfigs: ReconciliationChildConfigRecord[]
        runs: ReconciliationRunRecord[]
        isInternalAdmin: boolean
      }
      const configurableClients = payload.clients.filter((client) => client.clientKind !== "child")
      const nextClientId = selectedClientIdRef.current || configurableClients[0]?.id || ""
      setClients(payload.clients)
      setConfigs(payload.configs)
      setChildConfigs(payload.childConfigs ?? [])
      setRuns(payload.runs)
      setIsInternalAdmin(payload.isInternalAdmin)
      selectedClientIdRef.current = nextClientId
      setSelectedClientId(nextClientId)
      const nextConfig = payload.configs.find((config) => config.ownerClientId === nextClientId)
      setForm(getConfigForm(nextConfig, payload.childConfigs ?? []))
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
      const payload = (await response.json()) as { run: ReconciliationRunRecord; reused: boolean }
      const resultRuns = "runs" in payload ? (payload as unknown as { runs: { run: ReconciliationRunRecord; reused: boolean }[] }).runs : []
      if (payload.reused) {
        toast.info("Ya existía un archivo para esa fecha. No se generó ni reenvió.", { id: toastId })
      } else if (resultRuns.length > 1) {
        const failed = resultRuns.filter((item) => item.run.status === "generation_failed" || item.run.status === "send_failed").length
        toast[failed > 0 ? "error" : "success"](`Generación terminada: ${resultRuns.length - failed}/${resultRuns.length} archivos listos.`, { id: toastId })
      } else if (payload.run) {
        showRunResultToast(payload.run, toastId, "Archivo generado.")
      } else {
        toast.info("No había archivos para generar.", { id: toastId })
      }
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
    const toastId = toast.loading("Probando conexión de entrega...")
    try {
      const response = await fetch("/api/reconciliations/config/test-sftp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerClientId: selectedClient.id }),
      })

      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible conectar al destino."), { id: toastId })
        return
      }

      toast.success("Conexión de entrega exitosa.", { id: toastId })
    } catch {
      toast.error("No fue posible probar la entrega en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const retrySftpSend = async (run: ReconciliationRunRecord) => {
    if (run.status === "sent" && !window.confirm("Este archivo ya fue enviado. ¿Quieres intentar enviarlo otra vez?")) {
      return
    }

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
      showRunResultToast(payload.run, toastId, "Archivo enviado.")
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
            setForm(getConfigForm(configs.find((config) => config.ownerClientId === clientId), childConfigs))
          }}
        />
      ) : null}

      {isInternalAdmin ? (
        <ExceptionQueue
          clients={clients}
          configs={configs}
          dismissedCount={dismissedExceptionCount}
          isSubmitting={isSubmitting}
          onDismiss={(runId) => setDismissedExceptionIds((ids) => [...ids, runId])}
          onRetrySend={retrySftpSend}
          onShowAllChange={setShowAllExceptions}
          runs={exceptionRuns}
          showAll={showAllExceptions}
        />
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
        {isInternalAdmin ? (
          <AdminConfigCard
            canGenerate={Boolean(selectedConfig?.isEnabled)}
            client={selectedClient}
            childClients={selectedChildClients}
            config={selectedConfig ?? null}
            form={form}
            generationDate={generationDate}
            generationDateBounds={generationDateBounds}
            isDirty={serializeConfigForm(form) !== serializeConfigForm(getConfigForm(selectedConfig ?? undefined, selectedChildConfigs))}
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
          config={selectedConfig ?? null}
          clients={clients}
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
  const configurableClients = props.clients.filter((client) => client.clientKind !== "child")

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
            {configurableClients.map((client) => (
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

function ExceptionQueue(props: {
  clients: ClientRecord[]
  configs: ReconciliationConfigRecord[]
  dismissedCount: number
  isSubmitting: boolean
  onDismiss: (runId: string) => void
  onRetrySend: (run: ReconciliationRunRecord) => void
  onShowAllChange: (showAll: boolean) => void
  runs: ReconciliationRunRecord[]
  showAll: boolean
}) {
  const visibleRuns = props.showAll ? props.runs : props.runs.slice(0, 5)
  const hiddenCount = Math.max(0, props.runs.length - visibleRuns.length)

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Pendientes operativos</CardTitle>
            <CardDescription>Archivos que requieren atención antes de cerrar el día.</CardDescription>
          </div>
          <Badge variant={props.runs.length > 0 ? "warning" : "secondary"}>{props.runs.length} pendiente{props.runs.length === 1 ? "" : "s"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {props.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pendientes por atender{props.dismissedCount > 0 ? " en esta vista" : ""}.</p>
        ) : (
          <>
            {visibleRuns.map((run) => {
              const client = props.clients.find((item) => item.id === run.subjectClientId)
              const config = props.configs.find((item) => item.ownerClientId === run.ownerClientId) ?? null
              const sendRelated = run.status !== "generation_failed"

              return (
                <div key={run.id} className="rounded-lg border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={run.status === "generated" ? "warning" : "destructive"}>{getExceptionTitle(run)}</Badge>
                        <span className="text-sm font-medium">{client?.displayName ?? run.ownerClientId}</span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {run.reconciledDate} · {run.filename ?? "Sin archivo"}
                      </p>
                      {sendRelated ? (
                        <p className="text-sm text-muted-foreground">{run.transactionCount} tx · {formatCurrency(run.totalAmount)}</p>
                      ) : null}
                      {getRunError(run) ? <p className="text-sm text-destructive">{getRunError(run)}</p> : null}
                      {sendRelated ? <p className="text-xs text-muted-foreground">Destino: {getSftpPath(config, run)}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {run.filename && !run.fileDeletedAt ? <DownloadButton run={run} /> : null}
                      {sendRelated ? (
                        <Button size="sm" type="button" variant={run.status === "send_failed" ? "destructive" : "outline"} disabled={props.isSubmitting} onClick={() => props.onRetrySend(run)}>
                          <RefreshCwIcon data-icon="inline-start" /> {run.status === "send_failed" ? "Reintentar" : "Enviar"}
                        </Button>
                      ) : null}
                      <Button size="sm" type="button" variant="ghost" onClick={() => props.onDismiss(run.id)}>Ocultar</Button>
                    </div>
                  </div>
                </div>
              )
            })}
            {hiddenCount > 0 ? (
              <Button type="button" variant="outline" onClick={() => props.onShowAllChange(true)}>Ver {hiddenCount} más</Button>
            ) : props.showAll && props.runs.length > 5 ? (
              <Button type="button" variant="outline" onClick={() => props.onShowAllChange(false)}>Ver menos</Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AdminConfigCard(props: {
  canGenerate: boolean
  client?: ClientRecord
  childClients: ClientRecord[]
  config: ReconciliationConfigRecord | null
  form: ConfigFormState
  generationDate: string
  generationDateBounds: { min: string; max: string }
  isDirty: boolean
  isLoading: boolean
  isSubmitting: boolean
  onFormChange: (form: ConfigFormState) => void
  onGenerate: () => void
  onGenerationDateChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onTestSftp: () => void
}) {
  const mode = props.config ? "edit" : "create"
  const showSftpFields = props.form.sftpEnabled || hasAnySftpValue(props.form)
  const disableSftpFields = !props.form.isEnabled || !props.form.sftpEnabled

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{mode === "edit" ? "Configuración" : "Crear configuración"}</CardTitle>
            <CardDescription>
              {props.client ? `${props.client.displayName} · ${getClientKindLabel(props.client.clientKind)}` : "Selecciona un cliente para continuar."}
            </CardDescription>
          </div>
          <Badge variant={props.form.isEnabled ? "secondary" : "outline"}>{props.form.isEnabled ? "Generación activa" : "Generación inactiva"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <details key={props.config?.id ?? "create"} open={mode === "create" ? true : undefined}>
          <summary className="mb-4 cursor-pointer text-sm font-medium text-muted-foreground">
            {mode === "edit" ? "Editar configuración" : "Completar configuración"}
          </summary>
        <form onSubmit={props.onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Generar archivos diarios</FieldLabel>
              <Select value={props.form.isEnabled ? "true" : "false"} onValueChange={(value) => props.onFormChange({ ...props.form, isEnabled: value === "true", sftpEnabled: value === "true" ? props.form.sftpEnabled : false })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Activo</SelectItem><SelectItem value="false">Inactivo</SelectItem></SelectContent>
              </Select>
            </Field>
            {props.client?.clientKind === "standalone" ? (
              <Field>
                <FieldLabel>Usuario conciliación</FieldLabel>
                <Input value={props.form.reconciliationUsername} onChange={(event) => props.onFormChange({ ...props.form, reconciliationUsername: event.target.value })} />
                <FieldDescription>Se usa en el nombre del archivo, no se deriva del nombre del cliente.</FieldDescription>
              </Field>
            ) : (
              <div className="rounded-lg border bg-background p-3">
                <p className="text-sm font-medium">Usuarios por asociado</p>
                <p className="mb-3 text-xs text-muted-foreground">Cada asociado activo genera un TXT independiente con este usuario en el nombre.</p>
                <div className="grid gap-3">
                  {props.childClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin asociados activos con identificador TAE.</p>
                  ) : props.childClients.map((child) => (
                    <Field key={child.id}>
                      <FieldLabel>{child.displayName}</FieldLabel>
                      <Input
                        value={props.form.childConfigs.find((item) => item.childClientId === child.id)?.reconciliationUsername ?? ""}
                        onChange={(event) => props.onFormChange({
                          ...props.form,
                          childConfigs: upsertChildConfig(props.form.childConfigs, child.id, event.target.value),
                        })}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Zona de corte</FieldLabel>
                <Select value={props.form.cutoffTimezone} onValueChange={(value) => props.onFormChange({ ...props.form, cutoffTimezone: value ?? props.form.cutoffTimezone })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{MEXICAN_TIMEZONES.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Diferencia en nombre</FieldLabel>
                <Input value={props.form.filenameTimeDifference} onChange={(event) => props.onFormChange({ ...props.form, filenameTimeDifference: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Formato fecha nombre</FieldLabel>
                <DateFormatSelect value={props.form.filenameDateFormat} onChange={(value) => props.onFormChange({ ...props.form, filenameDateFormat: value })} />
              </Field>
              <Field>
                <FieldLabel>Formato fecha contenido</FieldLabel>
                <DateFormatSelect value={props.form.contentDateFormat} onChange={(value) => props.onFormChange({ ...props.form, contentDateFormat: value })} />
              </Field>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Entrega automática</p>
                  <p className="text-xs text-muted-foreground">SFTP recomendado; FTP se permite solo si el cliente lo exige.</p>
                </div>
                <Select disabled={!props.form.isEnabled} value={props.form.sftpEnabled ? "true" : "false"} onValueChange={(value) => props.onFormChange({ ...props.form, sftpEnabled: value === "true" })}>
                  <SelectTrigger className="w-32 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Activo</SelectItem><SelectItem value="false">Inactivo</SelectItem></SelectContent>
                </Select>
              </div>
              {showSftpFields ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field><FieldLabel>Protocolo</FieldLabel><Select disabled={disableSftpFields} value={props.form.deliveryProtocol} onValueChange={(value) => props.onFormChange({ ...props.form, deliveryProtocol: value === "ftp" ? "ftp" : "sftp" })}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sftp">SFTP</SelectItem><SelectItem value="ftp">FTP</SelectItem></SelectContent></Select></Field>
                  <Field><FieldLabel>Host</FieldLabel><Input disabled={disableSftpFields} value={props.form.sftpHost} onChange={(event) => props.onFormChange({ ...props.form, sftpHost: event.target.value })} /></Field>
                  <Field><FieldLabel>Puerto</FieldLabel><Input disabled={disableSftpFields} inputMode="numeric" value={props.form.sftpPort} onChange={(event) => props.onFormChange({ ...props.form, sftpPort: event.target.value })} /></Field>
                  <Field><FieldLabel>Usuario</FieldLabel><Input disabled={disableSftpFields} value={props.form.sftpUsername} onChange={(event) => props.onFormChange({ ...props.form, sftpUsername: event.target.value })} /></Field>
                  <Field><FieldLabel>Ruta remota</FieldLabel><Input disabled={disableSftpFields} value={props.form.sftpRemotePath} onChange={(event) => props.onFormChange({ ...props.form, sftpRemotePath: event.target.value })} /></Field>
                  <Field><FieldLabel>Vault secret</FieldLabel><Input disabled={disableSftpFields} value={props.form.sftpPasswordSecretName} onChange={(event) => props.onFormChange({ ...props.form, sftpPasswordSecretName: event.target.value })} /></Field>
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border bg-background p-3">
              <Field>
                <FieldLabel>Generar archivo para fecha</FieldLabel>
                <Input type="date" max={props.generationDateBounds.max} min={props.generationDateBounds.min} value={props.generationDate} onChange={(event) => props.onGenerationDateChange(event.target.value)} />
                <FieldDescription>Solo fechas cerradas. Si ya existe un archivo para esa fecha, se mostrará el existente.</FieldDescription>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isSubmitting || props.isLoading || !props.client}>
                <SaveIcon data-icon="inline-start" /> {mode === "edit" ? "Guardar cambios" : "Crear configuración"}
              </Button>
              <Button type="button" variant="outline" disabled={props.isSubmitting || !props.config || props.isDirty} onClick={props.onTestSftp}>
                <ServerIcon data-icon="inline-start" /> Probar entrega
              </Button>
              <Button type="button" variant="outline" disabled={props.isSubmitting || !props.canGenerate} onClick={props.onGenerate}>
                <PlayIcon data-icon="inline-start" /> Generar archivo
              </Button>
            </div>
            {!props.canGenerate ? <p className="text-sm text-muted-foreground">Activa y guarda la configuración antes de generar archivos.</p> : null}
            {props.isDirty && props.config ? <p className="text-sm text-muted-foreground">Guarda cambios antes de probar la entrega.</p> : null}
          </FieldGroup>
        </form>
        </details>
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
            <AlertDescription>Tu archivo diario aparecerá aquí cuando esté disponible.</AlertDescription>
          </Alert>
        ) : (
          <>
            <Badge variant={props.config.isEnabled ? "secondary" : "outline"}>{props.config.isEnabled ? "Conciliación activa" : "Conciliación inactiva"}</Badge>
            <p className="text-sm text-muted-foreground">Los archivos disponibles se muestran en el historial para descarga.</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DateFormatSelect(props: {
  value: ConfigFormState["filenameDateFormat"]
  onChange: (value: ConfigFormState["filenameDateFormat"]) => void
}) {
  return (
    <Select value={props.value} onValueChange={(value) => props.onChange(value === "aaaammdd" ? "aaaammdd" : "ddmmaaaa")}>
      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ddmmaaaa">ddmmaaaa</SelectItem>
        <SelectItem value="aaaammdd">aaaammdd</SelectItem>
      </SelectContent>
    </Select>
  )
}

function RunHistoryCard(props: {
  client?: ClientRecord
  clients: ClientRecord[]
  config: ReconciliationConfigRecord | null
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
            <EmptyHeader><EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia><EmptyTitle>{props.isInternalAdmin ? "Sin archivos generados" : "Aún no hay archivos de conciliación"}</EmptyTitle><EmptyDescription>{props.isInternalAdmin ? "Cuando exista una ejecución, aparecerá aquí." : "Cuando tu archivo diario esté disponible, aparecerá aquí para descarga."}</EmptyDescription></EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              {props.isInternalAdmin ? (
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Asociado</TableHead><TableHead>Nombre</TableHead><TableHead>Archivo</TableHead><TableHead>Entrega</TableHead><TableHead>Tx</TableHead><TableHead>Monto</TableHead><TableHead>Diagnóstico</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
              ) : (
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Archivo</TableHead><TableHead>Estado</TableHead><TableHead>Tx</TableHead><TableHead>Monto</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
              )}
              <TableBody>
                {props.runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.reconciledDate}</TableCell>
                    {props.isInternalAdmin ? <TableCell>{getRunSubjectLabel(run, props.clients)}</TableCell> : null}
                    <TableCell className="max-w-[260px] truncate">{run.filename ?? "No disponible"}</TableCell>
                    {props.isInternalAdmin ? (
                      <>
                        <TableCell><FileStatusBadge run={run} /></TableCell>
                        <TableCell><DeliveryStatusBadge config={props.config} run={run} /></TableCell>
                      </>
                    ) : (
                      <TableCell><ClientStatusBadge config={props.config} run={run} /></TableCell>
                    )}
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
                            <AlertCircleIcon data-icon="inline-start" /> Ver diagnóstico
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {run.filename && !run.fileDeletedAt ? <DownloadButton run={run} /> : <span className="text-xs text-muted-foreground">No disponible</span>}
                        {props.isInternalAdmin && run.filename && !run.fileDeletedAt && (run.status === "generated" || run.status === "sent" || run.status === "send_failed") ? (
                          <Button size="sm" type="button" variant={run.status === "send_failed" ? "destructive" : "outline"} disabled={props.isSubmitting} onClick={() => props.onRetrySend(run)}>
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
            <SheetTitle>Detalle de conciliación</SheetTitle>
            <SheetDescription>
              {selectedErrorRun
                ? `Conciliación ${selectedErrorRun.reconciledDate}`
                : "Detalle de conciliación"}
            </SheetDescription>
          </SheetHeader>
          {selectedErrorRun ? (
            <div className="space-y-4 px-4 pb-4">
              <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
                <SummaryItem label="Archivo" value={getFileStatusLabel(selectedErrorRun)} />
                <SummaryItem label="Entrega" value={getDeliveryStatusLabel(props.config, selectedErrorRun)} />
                <SummaryItem label="Nombre" value={selectedErrorRun.filename ?? "No disponible"} />
                <SummaryItem label="Ruta remota" value={getSftpPath(props.config, selectedErrorRun)} />
                <SummaryItem label="Tx" value={String(selectedErrorRun.transactionCount)} />
                <SummaryItem label="Monto" value={formatCurrency(selectedErrorRun.totalAmount)} />
              </div>
              {getRunError(selectedErrorRun) ? (
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-3 text-xs leading-relaxed text-foreground">
                  {getRunError(selectedErrorRun)}
                </pre>
              ) : null}
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

function DownloadButton({ run }: { run: ReconciliationRunRecord }) {
  return (
    <Button size="sm" variant="outline" render={<a href={`/api/reconciliations/runs/${run.id}/download`} />}>
      <DownloadIcon data-icon="inline-start" /> Descargar
    </Button>
  )
}

function FileStatusBadge({ run }: { run: ReconciliationRunRecord }) {
  if (run.fileDeletedAt) {
    return <Badge variant="outline">Expirado</Badge>
  }

  if (run.status === "generation_failed") {
    return <Badge variant="destructive"><AlertCircleIcon data-icon="inline-start" />No generado</Badge>
  }

  return <Badge variant="secondary"><CheckCircle2Icon data-icon="inline-start" />Generado</Badge>
}

function DeliveryStatusBadge(props: { config: ReconciliationConfigRecord | null; run: ReconciliationRunRecord }) {
  const label = getDeliveryStatusLabel(props.config, props.run)

  if (label === "Enviado") {
    return <Badge variant="secondary"><CheckCircle2Icon data-icon="inline-start" />{label}</Badge>
  }
  if (label === "Falló") {
    return <Badge variant="destructive"><AlertCircleIcon data-icon="inline-start" />{label}</Badge>
  }
  if (label === "Pendiente") {
    return <Badge variant="warning">{label}</Badge>
  }
  return <Badge variant="outline">{label}</Badge>
}

function ClientStatusBadge(props: { config: ReconciliationConfigRecord | null; run: ReconciliationRunRecord }) {
  const label = getClientStatusLabel(props.config, props.run)

  if (label === "Entregado" || label === "Disponible") {
    return <Badge variant="secondary"><CheckCircle2Icon data-icon="inline-start" />{label}</Badge>
  }
  if (label === "Entrega pendiente") {
    return <Badge variant="warning">{label}</Badge>
  }
  return <Badge variant="outline">{label}</Badge>
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

const getFileStatusLabel = (run: ReconciliationRunRecord) => {
  if (run.fileDeletedAt) {
    return "Expirado"
  }
  return run.status === "generation_failed" ? "No generado" : "Generado"
}

const getDeliveryStatusLabel = (config: ReconciliationConfigRecord | null, run: ReconciliationRunRecord) => {
  if (run.status === "generation_failed") {
    return "No aplica"
  }
  if (run.status === "send_failed") {
    return "Falló"
  }
  if (run.status === "sent") {
    return "Enviado"
  }
  if (!config?.sftpEnabled) {
    return "No aplica"
  }
  return "Pendiente"
}

const getClientStatusLabel = (config: ReconciliationConfigRecord | null, run: ReconciliationRunRecord) => {
  if (run.fileDeletedAt) {
    return "Expirado"
  }
  if (run.status === "generation_failed") {
    return "No disponible"
  }
  if (run.status === "sent") {
    return "Entregado"
  }
  if (config?.sftpEnabled || run.status === "send_failed") {
    return "Entrega pendiente"
  }
  return "Disponible"
}

const getSftpActionLabel = (status: ReconciliationRunRecord["status"]) => {
  if (status === "generated") {
    return "Enviar"
  }
  if (status === "sent") {
    return "Reenviar"
  }
  return "Reintentar"
}

const getRunError = (run: ReconciliationRunRecord) => run.internalError || run.lastSendError || null

const getExceptionTitle = (run: ReconciliationRunRecord) => {
  if (run.status === "generation_failed") {
    return "No se pudo generar archivo"
  }
  if (run.status === "send_failed") {
    return "Falló entrega"
  }
  return "Archivo pendiente de envío"
}

const getExceptionRuns = (runs: ReconciliationRunRecord[], configs: ReconciliationConfigRecord[]) => {
  const configByOwner = new Map(configs.map((config) => [config.ownerClientId, config]))
  return runs
    .filter((run) => {
      if (run.fileDeletedAt) {
        return false
      }
      if (run.status === "generation_failed" || run.status === "send_failed") {
        return true
      }
      return run.status === "generated" && configByOwner.get(run.ownerClientId)?.sftpEnabled
    })
    .sort((left, right) => getExceptionRank(left) - getExceptionRank(right) || left.reconciledDate.localeCompare(right.reconciledDate))
}

const getExceptionRank = (run: ReconciliationRunRecord) => {
  if (run.status === "generation_failed") {
    return 0
  }
  if (run.status === "send_failed") {
    return 1
  }
  return 2
}

const getSftpPath = (config: ReconciliationConfigRecord | null, run: ReconciliationRunRecord) => {
  if (!config?.sftpRemotePath || !run.filename) {
    return "No aplica"
  }

  return `${config.sftpRemotePath.replace(/\/+$/, "")}/${run.filename}`
}

const showRunResultToast = (run: ReconciliationRunRecord, toastId: string | number, fallback: string) => {
  if (run.status === "sent") {
    toast.success("Archivo generado y enviado.", { id: toastId })
    return
  }

  if (run.status === "send_failed") {
    toast.error(`Archivo generado, pero falló el envío: ${run.lastSendError ?? "revisa el detalle."}`, { id: toastId })
    return
  }

  if (run.status === "generation_failed") {
    toast.error(`Falló la generación: ${run.internalError ?? "revisa el detalle."}`, { id: toastId })
    return
  }

  toast.success(fallback, { id: toastId })
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(value)

const serializeConfigForm = (form: ConfigFormState) => JSON.stringify(form)

const hasAnySftpValue = (form: ConfigFormState) =>
  Boolean(form.sftpHost || form.sftpUsername || form.sftpRemotePath || form.sftpPasswordSecretName)

const getConfigForm = (
  config?: ReconciliationConfigRecord,
  childConfigs: ReconciliationChildConfigRecord[] = []
) => ({
  isEnabled: config?.isEnabled ?? false,
  reconciliationUsername: config?.reconciliationUsername ?? "",
  cutoffTimezone: config?.cutoffTimezone ?? "America/Mexico_City",
  filenameTimeDifference: config?.filenameTimeDifference ?? "-1",
  filenameDateFormat: config?.filenameDateFormat ?? "ddmmaaaa",
  contentDateFormat: config?.contentDateFormat ?? "ddmmaaaa",
  deliveryProtocol: config?.deliveryProtocol ?? "sftp",
  sftpEnabled: config?.sftpEnabled ?? false,
  sftpHost: config?.sftpHost ?? "",
  sftpPort: String(config?.sftpPort ?? 22),
  sftpUsername: config?.sftpUsername ?? "",
  sftpRemotePath: config?.sftpRemotePath ?? "",
  sftpPasswordSecretName: config?.sftpPasswordSecretName ?? "",
  childConfigs: config
    ? childConfigs
        .filter((childConfig) => childConfig.configId === config.id)
        .map((childConfig) => ({
          childClientId: childConfig.childClientId,
          reconciliationUsername: childConfig.reconciliationUsername,
        }))
    : [],
})

const upsertChildConfig = (
  childConfigs: ConfigFormState["childConfigs"],
  childClientId: string,
  reconciliationUsername: string
) => {
  const nextUsername = reconciliationUsername.trim()
  const existing = childConfigs.find((childConfig) => childConfig.childClientId === childClientId)

  if (!nextUsername) {
    return childConfigs.filter((childConfig) => childConfig.childClientId !== childClientId)
  }

  if (existing) {
    return childConfigs.map((childConfig) =>
      childConfig.childClientId === childClientId
        ? { ...childConfig, reconciliationUsername }
        : childConfig
    )
  }

  return [...childConfigs, { childClientId, reconciliationUsername }]
}

const getRunSubjectLabel = (run: ReconciliationRunRecord, clients: ClientRecord[]) =>
  clients.find((client) => client.id === run.subjectClientId)?.displayName ?? "-"

const getYesterdayDate = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

const getGenerationDateBounds = () => ({
  max: getYesterdayDate(),
  min: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10),
})
