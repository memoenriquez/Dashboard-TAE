"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { readApiErrorMessage } from "@/lib/api/client-error"

interface GroupRecord {
  id: string
  parentClientId: string
  displayName: string
  childClients: ClientRecord[]
}

interface ClientRecord {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "parent" | "child" | "standalone"
  isActive: boolean
}

export function GroupForm() {
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [parentClientId, setParentClientId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [selectedChildClientId, setSelectedChildClientId] = useState("")
  const [childClientIds, setChildClientIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parentClients = clients.filter((client) => client.clientKind === "parent")
  const childClients = clients.filter(
    (client) => client.clientKind === "child" && client.isActive
  )
  const selectedChildClients = childClientIds
    .map((childClientId) => clients.find((client) => client.id === childClientId))
    .filter((client): client is ClientRecord => Boolean(client))
  const canSubmitGroup =
    parentClientId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    childClientIds.length > 0

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [groupsResponse, clientsResponse] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch("/api/admin/clients"),
      ])

      if (!groupsResponse.ok) {
        toast.error(await readApiErrorMessage(groupsResponse, "No fue posible cargar grupos."))
        return
      }

      if (!clientsResponse.ok) {
        toast.error(
          await readApiErrorMessage(clientsResponse, "No fue posible cargar clientes.")
        )
        return
      }

      const groupsPayload = (await groupsResponse.json()) as { groups: GroupRecord[] }
      const clientsPayload = (await clientsResponse.json()) as { clients: ClientRecord[] }
      setGroups(groupsPayload.groups)
      setClients(clientsPayload.clients)
    } catch {
      toast.error("No fue posible cargar grupos en este momento.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [])

  const handleAddChildClient = () => {
    if (!selectedChildClientId || childClientIds.includes(selectedChildClientId)) {
      return
    }

    setChildClientIds((currentIds) => [...currentIds, selectedChildClientId])
    setSelectedChildClientId("")
  }

  const handleRemoveChildClient = (childClientId: string) => {
    setChildClientIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== childClientId)
    )
  }

  const handleEditGroup = (group: GroupRecord) => {
    setEditingGroupId(group.id)
    setParentClientId(group.parentClientId)
    setDisplayName(group.displayName)
    setSelectedChildClientId("")
    setChildClientIds(group.childClients.map((childClient) => childClient.id))
    toast.info("Editando grupo de clientes.")
  }

  const handleCancelEdit = () => {
    setEditingGroupId(null)
    setParentClientId("")
    setDisplayName("")
    setSelectedChildClientId("")
    setChildClientIds([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    const isEditing = Boolean(editingGroupId)
    const toastId = toast.loading(isEditing ? "Actualizando grupo..." : "Guardando grupo...")

    try {
      const response = await fetch("/api/admin/groups", {
        method: editingGroupId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingGroupId ?? undefined,
          parentClientId,
          displayName,
          childClientIds,
        }),
      })

      if (!response.ok) {
        toast.error(await readApiErrorMessage(response, "No fue posible guardar el grupo."), {
          id: toastId,
        })
        return
      }

      setEditingGroupId(null)
      setParentClientId("")
      setDisplayName("")
      setSelectedChildClientId("")
      setChildClientIds([])
      toast.success(isEditing ? "Grupo actualizado." : "Grupo guardado.", {
        id: toastId,
      })
      await loadData()
    } catch {
      toast.error("No fue posible guardar el grupo en este momento.", {
        id: toastId,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>
            {editingGroupId ? "Editar grupo de clientes" : "Nuevo grupo de clientes"}
          </CardTitle>
          <CardDescription>
            {editingGroupId
              ? "Actualiza el cliente principal y los asociados del grupo."
              : "Vincula un cliente principal con los asociados que podrá consultar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="parentClientId">Cliente principal</FieldLabel>
                <Select
                  value={parentClientId}
                  disabled={parentClients.length === 0 || isSubmitting}
                  onValueChange={(value) => {
                    if (value) {
                      setParentClientId(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background" id="parentClientId">
                    <SelectValue placeholder="Selecciona cliente principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {getClientLabelText(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {parentClients.length === 0
                    ? "Crea un cliente principal antes de crear grupos."
                    : "El cliente principal podrá consultar las transacciones del grupo."}
                </FieldDescription>
                <input
                  type="hidden"
                  value={parentClientId}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="groupName">Nombre del grupo</FieldLabel>
                <Input
                  id="groupName"
                  required
                  disabled={isSubmitting}
                  value={displayName}
                  className="bg-background"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="childClientIds">Clientes asociados</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={selectedChildClientId}
                    disabled={childClients.length === 0 || isSubmitting}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedChildClientId(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-background" id="childClientIds">
                      <SelectValue placeholder="Selecciona cliente asociado" />
                    </SelectTrigger>
                    <SelectContent>
                      {childClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientLabelText(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedChildClientId || isSubmitting}
                    onClick={handleAddChildClient}
                  >
                    Agregar
                  </Button>
                </div>
                <FieldDescription>
                  {childClients.length === 0
                    ? "Primero crea clientes tipo Asociado con cuentaID y estado activo."
                    : "Agrega uno o más clientes asociados al grupo."}
                </FieldDescription>
                {childClients.length === 0 ? (
                  <Alert>
                    <AlertTitle>No hay asociados disponibles</AlertTitle>
                    <AlertDescription>
                      Ve a Clientes y registra al menos un cliente tipo Asociado con
                      cuentaID. Después podrás agregarlo a este grupo.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {selectedChildClients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedChildClients.map((client) => (
                      <Badge key={client.id} variant="secondary">
                        {client.displayName}
                        <button
                          type="button"
                          aria-label={`Quitar ${client.displayName} del grupo`}
                          className="ml-1"
                          disabled={isSubmitting}
                          onClick={() => handleRemoveChildClient(client.id)}
                        >
                          quitar
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Button
                type="submit"
                disabled={isSubmitting || !canSubmitGroup}
              >
                {isSubmitting
                  ? "Guardando..."
                  : editingGroupId
                    ? "Actualizar grupo"
                    : "Guardar grupo"}
              </Button>
              {editingGroupId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleCancelEdit}
                >
                  Cancelar edición
                </Button>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Grupos</CardTitle>
          <CardDescription>
            Grupos configurados para consulta compartida de transacciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {groups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cliente principal</TableHead>
                  <TableHead>Clientes asociados</TableHead>
                  <TableHead>ID técnico</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.displayName}</TableCell>
                    <TableCell>{getClientLabel(clients, group.parentClientId)}</TableCell>
                    <TableCell className="whitespace-normal">
                      {group.childClients.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {group.childClients.map((client) => (
                            <Badge
                              key={client.id}
                              variant={client.isActive ? "secondary" : "outline"}
                            >
                              {getClientLabelText(client)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sin asociados
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatShortId(group.id)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleEditGroup(group)}
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
                  {isLoading ? "Cargando grupos..." : "Aún no hay grupos"}
                </EmptyTitle>
                <EmptyDescription>
                  Crea clientes principales y asociados; después arma un grupo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const getClientLabel = (clients: ClientRecord[], clientId: string) => {
  const client = clients.find((candidate) => candidate.id === clientId)
  return client ? getClientLabelText(client) : clientId
}

const getClientLabelText = (client: ClientRecord) =>
  `${client.displayName} · ${client.externalClientId ?? "Sin cuentaID"}`

const formatShortId = (id: string) => `${id.slice(0, 8)}...`
