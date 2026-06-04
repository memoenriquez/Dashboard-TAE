"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ClientRecord {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "parent" | "child" | "standalone"
  isActive: boolean
  relationshipSummary?: {
    clientId: string
    groupCount: number
    childClientCount: number
    parentGroupNames: string[]
  }
}

interface ExternalClientRecord {
  externalClientId: number
  displayName: string
  transactionCount: number
  lastTransactionAt: string | null
  isLinked: boolean
}

export function ClientForm() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [externalClients, setExternalClients] = useState<ExternalClientRecord[]>([])
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [externalClientId, setExternalClientId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [clientKind, setClientKind] = useState<ClientRecord["clientKind"]>("standalone")
  const [isActive, setIsActive] = useState(true)
  const [externalSearch, setExternalSearch] = useState("")
  const [externalPage, setExternalPage] = useState(1)
  const [externalHasMore, setExternalHasMore] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingExternal, setIsLoadingExternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isExternalClientIdRequired = clientKind !== "parent"

  const loadClients = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch("/api/admin/clients")
    if (!response.ok) {
      setMessage("No fue posible cargar clientes.")
      setIsLoading(false)
      return
    }
    const payload = (await response.json()) as { clients: ClientRecord[] }
    setClients(payload.clients)
    setIsLoading(false)
  }, [])

  const loadExternalClients = useCallback(async (page: number, search: string) => {
    setIsLoadingExternal(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
    })

    if (search.trim()) {
      params.set("search", search.trim())
    }

    const response = await fetch(`/api/admin/external-clients?${params.toString()}`)
    if (!response.ok) {
      setMessage("No fue posible cargar clientes detectados.")
      setIsLoadingExternal(false)
      return
    }

    const payload = (await response.json()) as {
      externalClients: ExternalClientRecord[]
      pagination: { hasMore: boolean }
    }
    setExternalClients(payload.externalClients)
    setExternalHasMore(payload.pagination.hasMore)
    setExternalPage(page)
    setIsLoadingExternal(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadClients()
      void loadExternalClients(1, "")
    })
  }, [loadClients, loadExternalClients])

  const handleExternalSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadExternalClients(1, externalSearch)
  }

  const handleSelectExternalClient = (client: ExternalClientRecord) => {
    setExternalClientId(String(client.externalClientId))
    setDisplayName(client.displayName)
    setEditingClientId(null)
    setIsActive(true)
    setMessage("Cliente seleccionado. Revisa el tipo y guarda el alta.")
  }

  const handleEditClient = (client: ClientRecord) => {
    setEditingClientId(client.id)
    setExternalClientId(client.externalClientId === null ? "" : String(client.externalClientId))
    setDisplayName(client.displayName)
    setClientKind(client.clientKind)
    setIsActive(client.isActive)
    setMessage("Editando cliente registrado.")
  }

  const handleCancelEdit = () => {
    setEditingClientId(null)
    setExternalClientId("")
    setDisplayName("")
    setClientKind("standalone")
    setIsActive(true)
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (isExternalClientIdRequired && !externalClientId.trim()) {
      setMessage(
        "El ID de cliente es obligatorio para clientes Asociados e Independientes."
      )
      return
    }

    setIsSubmitting(true)
    const response = await fetch("/api/admin/clients", {
      method: editingClientId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingClientId ?? undefined,
        externalClientId: externalClientId.trim() ? Number(externalClientId) : null,
        displayName,
        clientKind,
        isActive,
      }),
    })

    if (!response.ok) {
      setMessage(await getApiErrorMessage(response, "No fue posible guardar el cliente."))
      setIsSubmitting(false)
      return
    }

    setEditingClientId(null)
    setExternalClientId("")
    setDisplayName("")
    setClientKind("standalone")
    setIsActive(true)
    setMessage(editingClientId ? "Cliente actualizado." : "Cliente guardado.")
    await Promise.all([loadClients(), loadExternalClients(externalPage, externalSearch)])
    setIsSubmitting(false)
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>{editingClientId ? "Editar cliente" : "Nuevo cliente"}</CardTitle>
          <CardDescription>
            {editingClientId
              ? "Actualiza el tipo, cuentaID, nombre y estado del cliente."
              : "Registra clientes para consultar sus transacciones en el dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="externalClientId">ID de cliente</FieldLabel>
                <Input
                  id="externalClientId"
                  inputMode="numeric"
                  disabled={isSubmitting}
                  value={externalClientId}
                  className="bg-background"
                  onChange={(event) => setExternalClientId(event.target.value)}
                />
                <FieldDescription>
                  {isExternalClientIdRequired
                    ? "Identificador del cliente en el sistema de recargas."
                    : "Opcional para clientes principales que solo agrupan asociados."}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="displayName">Nombre visible</FieldLabel>
                <Input
                  id="displayName"
                  required
                  disabled={isSubmitting}
                  value={displayName}
                  className="bg-background"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="clientKind">Tipo</FieldLabel>
                <Select
                  value={clientKind}
                  disabled={isSubmitting}
                  onValueChange={(value) => {
                    if (value) {
                      setClientKind(value as ClientRecord["clientKind"])
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background" id="clientKind">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Principal</SelectItem>
                    <SelectItem value="child">Asociado</SelectItem>
                    <SelectItem value="standalone">Cliente independiente</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="clientStatus">Estado</FieldLabel>
                <Select
                  value={isActive ? "active" : "inactive"}
                  disabled={isSubmitting}
                  onValueChange={(value) => setIsActive(value === "active")}
                >
                  <SelectTrigger className="w-full bg-background" id="clientStatus">
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : editingClientId
                    ? "Actualizar cliente"
                    : "Guardar cliente"}
              </Button>
              {editingClientId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleCancelEdit}
                >
                  Cancelar edición
                </Button>
              ) : null}
              {message ? (
                <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {message}
                </p>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Clientes registrados</CardTitle>
          <CardDescription>
            Clientes disponibles para usuarios y grupos de consulta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>ID de cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Relaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.displayName}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatClientExternalId(client)}
                    </TableCell>
                    <TableCell>{getClientKindLabel(client.clientKind)}</TableCell>
                    <TableCell>{getRelationshipLabel(client)}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "secondary" : "outline"}>
                        {client.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleEditClient(client)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="m-6 rounded-2xl border bg-muted/20">
              <EmptyHeader>
                <EmptyTitle>
                  {isLoading ? "Cargando clientes..." : "Aún no hay clientes"}
                </EmptyTitle>
                <EmptyDescription>
                  Registra primero un cliente principal o independiente.
                  Después podrás vincular usuarios y grupos.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden shadow-sm xl:col-span-2">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Clientes detectados</CardTitle>
          <CardDescription>
            Clientes disponibles en el catálogo de recargas para vincularlos al
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <form onSubmit={handleExternalSearchSubmit}>
            <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field>
                <FieldLabel htmlFor="externalClientSearch">Buscar cliente</FieldLabel>
                <Input
                  id="externalClientSearch"
                  value={externalSearch}
                  className="bg-background"
                  placeholder="ID, nombre comercial o razón social"
                  onChange={(event) => setExternalSearch(event.target.value)}
                />
              </Field>
              <Field className="justify-end">
                <Button type="submit" disabled={isLoadingExternal}>
                  {isLoadingExternal ? "Buscando..." : "Buscar"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          {externalClients.length > 0 ? (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Nombre</TableHead>
                    <TableHead>ID de cliente</TableHead>
                    <TableHead>Transacciones</TableHead>
                    <TableHead>Última transacción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {externalClients.map((client) => (
                    <TableRow key={client.externalClientId}>
                      <TableCell className="font-medium">{client.displayName}</TableCell>
                      <TableCell className="tabular-nums">
                        {client.externalClientId}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {client.transactionCount.toLocaleString("es-MX")}
                      </TableCell>
                      <TableCell>
                        {client.lastTransactionAt
                          ? new Date(client.lastTransactionAt).toLocaleString("es-MX")
                          : "Sin transacciones"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.isLinked ? "secondary" : "outline"}>
                          {client.isLinked ? "Vinculado" : "No vinculado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={client.isLinked || isSubmitting}
                          onClick={() => handleSelectExternalClient(client)}
                        >
                          Seleccionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="rounded-2xl border bg-muted/20">
              <EmptyHeader>
                <EmptyTitle>
                  {isLoadingExternal ? "Cargando clientes..." : "Sin clientes detectados"}
                </EmptyTitle>
                <EmptyDescription>
                  Ajusta la búsqueda o verifica que el catálogo de recargas tenga
                  clientes.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Guarda un cliente detectado para agregarlo al dashboard.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={externalPage <= 1 || isLoadingExternal}
                onClick={() => void loadExternalClients(externalPage - 1, externalSearch)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!externalHasMore || isLoadingExternal}
                onClick={() => void loadExternalClients(externalPage + 1, externalSearch)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const getApiErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  return payload?.error ?? fallback
}

const getClientKindLabel = (clientKind: ClientRecord["clientKind"]) => {
  if (clientKind === "parent") {
    return "Principal"
  }

  if (clientKind === "child") {
    return "Asociado"
  }

  return "Cliente independiente"
}

const formatClientExternalId = (client: Pick<ClientRecord, "externalClientId">) =>
  client.externalClientId === null ? "Sin cuentaID" : client.externalClientId

const getRelationshipLabel = (client: ClientRecord) => {
  const summary = client.relationshipSummary

  if (client.clientKind === "parent") {
    if (!summary || summary.groupCount === 0) {
      return "Sin grupos"
    }

    return `${summary.groupCount} grupo${summary.groupCount === 1 ? "" : "s"} · ${summary.childClientCount} asociado${summary.childClientCount === 1 ? "" : "s"}`
  }

  if (client.clientKind === "child") {
    if (!summary || summary.groupCount === 0) {
      return "Sin grupo asignado"
    }

    return summary.parentGroupNames.join(", ")
  }

  return "Independiente"
}
