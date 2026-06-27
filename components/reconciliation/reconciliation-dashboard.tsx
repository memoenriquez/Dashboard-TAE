"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { DownloadIcon, PlayIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [form, setForm] = useState({
    isEnabled: false,
    reconciliationUsername: "",
    cutoffTimezone: "America/Mexico_City",
    filenameTimeDifference: "-1",
    sftpEnabled: false,
    sftpHost: "",
    sftpPort: "22",
    sftpUsername: "",
    sftpRemotePath: "",
    sftpPasswordSecretName: "",
  })
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0]
  const selectedConfig = selectedClient
    ? configs.find((config) => config.ownerClientId === selectedClient.id)
    : null
  const selectedRuns = selectedClient
    ? runs.filter((run) => run.ownerClientId === selectedClient.id)
    : []

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
    const toastId = toast.loading("Guardando configuración...")
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
      toast.success("Configuración guardada.", { id: toastId })
      await loadData()
    } catch {
      toast.error("No fue posible guardar en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateYesterday = async () => {
    if (!selectedClient) {
      return
    }
    const date = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    setIsSubmitting(true)
    const toastId = toast.loading("Generando archivo...")
    try {
      const response = await fetch("/api/reconciliations/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerClientId: selectedClient.id, reconciledDate: date }),
      })
      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible generar."), { id: toastId })
        return
      }
      toast.success("Archivo generado.", { id: toastId })
      await loadData()
    } catch {
      toast.error("No fue posible generar en este momento.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Conciliación TAE</CardTitle>
          <CardDescription>Configura generación diaria y SFTP por cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length > 1 ? (
            <Select
              value={selectedClient?.id ?? ""}
              onValueChange={(clientId) => {
                const nextClientId = clientId ?? ""
                selectedClientIdRef.current = nextClientId
                setSelectedClientId(nextClientId)
                setForm(getConfigForm(configs.find((config) => config.ownerClientId === nextClientId)))
              }}
            >
              <SelectTrigger className="mb-4 w-full bg-background">
                <SelectValue placeholder="Selecciona cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.displayName} · {client.clientKind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <form onSubmit={saveConfig}>
            <FieldGroup>
              <Field>
                <FieldLabel>Activa</FieldLabel>
                <Select disabled={!isInternalAdmin} value={form.isEnabled ? "true" : "false"} onValueChange={(value) => setForm({ ...form, isEnabled: value === "true" })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sí</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Usuario conciliación</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.reconciliationUsername} onChange={(event) => setForm({ ...form, reconciliationUsername: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Zona de corte</FieldLabel>
                <Select disabled={!isInternalAdmin} value={form.cutoffTimezone} onValueChange={(value) => setForm({ ...form, cutoffTimezone: value ?? form.cutoffTimezone })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Diferencia en nombre</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.filenameTimeDifference} onChange={(event) => setForm({ ...form, filenameTimeDifference: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Host SFTP</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.sftpHost} onChange={(event) => setForm({ ...form, sftpHost: event.target.value })} />
                <FieldDescription>La contraseña vive en Vault; aquí solo va el nombre del secreto.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>SFTP activo</FieldLabel>
                <Select disabled={!isInternalAdmin} value={form.sftpEnabled ? "true" : "false"} onValueChange={(value) => setForm({ ...form, sftpEnabled: value === "true" })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sí</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Usuario SFTP</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.sftpUsername} onChange={(event) => setForm({ ...form, sftpUsername: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Ruta remota</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.sftpRemotePath} onChange={(event) => setForm({ ...form, sftpRemotePath: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Secreto Vault</FieldLabel>
                <Input disabled={!isInternalAdmin} value={form.sftpPasswordSecretName} onChange={(event) => setForm({ ...form, sftpPasswordSecretName: event.target.value })} />
              </Field>
              {isInternalAdmin ? (
                <>
                  <Button type="submit" disabled={isSubmitting || isLoading || !selectedClient}>
                    <SaveIcon data-icon="inline-start" /> Guardar
                  </Button>
                  <Button type="button" variant="outline" disabled={isSubmitting || !selectedConfig} onClick={generateYesterday}>
                    <PlayIcon data-icon="inline-start" /> Generar ayer
                  </Button>
                </>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Archivos generados para el cliente seleccionado.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Archivo</TableHead><TableHead>Estado</TableHead><TableHead>Tx</TableHead><TableHead>Monto</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
            <TableBody>
              {selectedRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.reconciledDate}</TableCell>
                  <TableCell>{run.filename ?? "No disponible"}</TableCell>
                  <TableCell><Badge variant={run.status === "generated" || run.status === "sent" ? "secondary" : "destructive"}>{run.status}</Badge></TableCell>
                  <TableCell>{run.transactionCount}</TableCell>
                  <TableCell>{formatCurrency(run.totalAmount)}</TableCell>
                  <TableCell>{run.filename && !run.fileDeletedAt ? <Button size="sm" variant="outline" render={<a href={`/api/reconciliations/runs/${run.id}/download`}><DownloadIcon data-icon="inline-start" /> Descargar</a>} /> : null}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
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
