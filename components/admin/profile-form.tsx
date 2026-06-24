"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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

import {
  formatShortId,
  getClientLabel,
  getClientLabelText,
} from "./profile-client-labels"

interface ProfileRecord {
  id: string
  clientId: string | null
  isInternalAdmin: boolean
  displayName: string
  email: string | null
  invitedAt: string | null
  emailConfirmedAt: string | null
  lastSeenAt: string | null
  invitationStatus: "accepted" | "pending" | "not_invited"
}

interface ClientRecord {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "parent" | "child" | "standalone"
  isActive: boolean
}

export function ProfileForm() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [editingProfile, setEditingProfile] = useState<ProfileRecord | null>(null)
  const [email, setEmail] = useState("")
  const [clientId, setClientId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResendingProfileId, setIsResendingProfileId] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [profilesResponse, clientsResponse] = await Promise.all([
        fetch("/api/admin/profiles"),
        fetch("/api/admin/clients"),
      ])

      if (!profilesResponse.ok) {
        toast.error(
          await readApiErrorMessage(profilesResponse, "No fue posible cargar usuarios.")
        )
        return
      }

      if (!clientsResponse.ok) {
        toast.error(await readApiErrorMessage(clientsResponse, "No fue posible cargar clientes."))
        return
      }

      const profilesPayload = (await profilesResponse.json()) as {
        profiles: ProfileRecord[]
      }
      const clientsPayload = (await clientsResponse.json()) as { clients: ClientRecord[] }
      setProfiles(profilesPayload.profiles)
      setClients(clientsPayload.clients)
    } catch {
      toast.error("No fue posible cargar usuarios en este momento.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    const toastId = toast.loading(
      editingProfile ? "Actualizando usuario..." : "Enviando invitación..."
    )

    let response: Response

    try {
      response = await fetch(editingProfile ? "/api/admin/profiles" : "/api/admin/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          editingProfile
            ? {
                id: editingProfile.id,
                clientId: editingProfile.isInternalAdmin ? null : clientId,
                displayName,
                isInternalAdmin: editingProfile.isInternalAdmin,
              }
            : {
                email,
                clientId,
                displayName,
              }
        ),
      })
    } catch {
      toast.error(
        editingProfile
          ? "No fue posible actualizar el usuario en este momento."
          : "No fue posible enviar la invitación en este momento.",
        { id: toastId }
      )
      setIsSubmitting(false)
      return
    }

    if (!response.ok) {
      toast.error(
        await readApiErrorMessage(
          response,
          editingProfile
            ? "No fue posible actualizar el usuario."
            : "No fue posible enviar la invitación."
        ),
        { id: toastId }
      )
      setIsSubmitting(false)
      return
    }

    setEditingProfile(null)
    setEmail("")
    setClientId("")
    setDisplayName("")
    toast.success(
      editingProfile
        ? "Usuario actualizado."
        : "Invitación enviada y usuario asignado al cliente.",
      { id: toastId }
    )
    await loadData()
    setIsSubmitting(false)
  }

  const handleEditProfile = (profile: ProfileRecord) => {
    setEditingProfile(profile)
    setEmail("")
    setClientId(profile.clientId ?? "")
    setDisplayName(profile.displayName)
  }

  const handleCancelEdit = () => {
    setEditingProfile(null)
    setEmail("")
    setClientId("")
    setDisplayName("")
  }

  const handleResendInvitation = async (profile: ProfileRecord) => {
    setIsResendingProfileId(profile.id)
    const toastId = toast.loading(
      `Reenviando invitación a ${profile.email ?? profile.displayName}...`
    )

    let response: Response

    try {
      response = await fetch("/api/admin/invitations/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      })
    } catch {
      toast.error("No fue posible reenviar la invitación en este momento.", {
        id: toastId,
      })
      setIsResendingProfileId(null)
      return
    }

    if (!response.ok) {
      toast.error(
        await readApiErrorMessage(
          response,
          "No fue posible reenviar la invitación."
        ),
        { id: toastId }
      )
      setIsResendingProfileId(null)
      return
    }

    toast.success(`Invitación reenviada a ${profile.email ?? profile.displayName}.`, {
      id: toastId,
    })
    await loadData()
    setIsResendingProfileId(null)
  }

  const canSubmit =
    isSubmitting ||
    Boolean(isResendingProfileId) ||
    (!editingProfile && clients.length === 0) ||
    (editingProfile ? !editingProfile.isInternalAdmin && !clientId : !clientId)
  const selectedClientLabel = clientId ? getClientLabel(clients, clientId) : ""

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>{editingProfile ? "Editar usuario" : "Invitar usuario"}</CardTitle>
          <CardDescription>
            {editingProfile
              ? "Actualiza el nombre visible y cliente asignado."
              : "Envía una invitación y asigna el usuario a un cliente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {editingProfile ? (
                <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  ID técnico: {formatShortId(editingProfile.id)}
                </p>
              ) : (
                <Field>
                  <FieldLabel htmlFor="profileEmail">Correo</FieldLabel>
                  <Input
                    id="profileEmail"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    className="bg-background"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <FieldDescription>
                    El usuario recibirá un correo para activar su cuenta.
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="profileDisplayName">Nombre visible</FieldLabel>
                <Input
                  id="profileDisplayName"
                  required
                  disabled={isSubmitting}
                  value={displayName}
                  className="bg-background"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profileClientId">Cliente asignado</FieldLabel>
                <Select
                  value={clientId}
                  disabled={
                    clients.length === 0 ||
                    isSubmitting ||
                    Boolean(editingProfile?.isInternalAdmin)
                  }
                  onValueChange={(value) => {
                    if (value) {
                      setClientId(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background" id="profileClientId">
                    <SelectValue placeholder="Selecciona cliente">
                      {selectedClientLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        disabled={!client.isActive}
                      >
                        {getClientLabelText(client)}
                        {client.isActive ? "" : " · inactivo"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {editingProfile?.isInternalAdmin
                    ? "Los administradores usan vista global y no requieren cliente asignado."
                    : clients.length === 0
                    ? "Crea al menos un cliente antes de vincular usuarios."
                    : "El usuario invitado podrá consultar la información de este cliente."}
                </FieldDescription>
                <input
                  type="hidden"
                  value={clientId}
                />
              </Field>
              <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {editingProfile
                  ? "El cambio actualiza el acceso del usuario dentro del dashboard."
                  : "La invitación deja listo el usuario para que pueda entrar al dashboard al activar su cuenta."}
              </p>
              <Button type="submit" disabled={canSubmit}>
                {isSubmitting
                  ? "Guardando..."
                  : editingProfile
                    ? "Actualizar usuario"
                    : "Enviar invitación"}
              </Button>
              {editingProfile ? (
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
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Usuarios vinculados a clientes o con acceso de administración.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {profiles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>ID técnico</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.displayName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {profile.email ?? "Sin correo"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatShortId(profile.id)}
                    </TableCell>
                    <TableCell>{getClientLabel(clients, profile.clientId)}</TableCell>
                    <TableCell>
                      <Badge variant={profile.isInternalAdmin ? "secondary" : "outline"}>
                        {profile.isInternalAdmin ? "Administrador" : "Usuario"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col items-center gap-1">
                        <Badge variant={getInvitationStatusVariant(profile.invitationStatus)}>
                          {getInvitationStatusLabel(profile.invitationStatus)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getInvitationStatusDescription(profile)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-center gap-2">
                        {profile.invitationStatus !== "accepted" && profile.email ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              isSubmitting ||
                              Boolean(isResendingProfileId) ||
                              !profile.email
                            }
                            onClick={() => handleResendInvitation(profile)}
                          >
                            {isResendingProfileId === profile.id
                              ? "Reenviando..."
                              : "Reenviar invitación"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSubmitting || Boolean(isResendingProfileId)}
                          onClick={() => handleEditProfile(profile)}
                        >
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="m-6 rounded-2xl border bg-muted/20">
              <EmptyHeader>
                <EmptyTitle>
                  {isLoading ? "Cargando usuarios..." : "Sin usuarios vinculados"}
                </EmptyTitle>
                <EmptyDescription>
                  Invita usuarios y vincúlalos aquí a un cliente.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const getInvitationStatusLabel = (status: ProfileRecord["invitationStatus"]) => {
  if (status === "accepted") {
    return "Aceptada"
  }

  if (status === "pending") {
    return "Pendiente"
  }

  return "Sin invitación"
}

const getInvitationStatusVariant = (status: ProfileRecord["invitationStatus"]) => {
  if (status === "accepted") {
    return "secondary"
  }

  if (status === "pending") {
    return "outline"
  }

  return "destructive"
}

const getInvitationStatusDescription = (profile: ProfileRecord) => {
  if (profile.invitationStatus === "accepted") {
    return profile.lastSeenAt
      ? `Última actividad: ${formatDateTime(profile.lastSeenAt)}`
      : "Cuenta confirmada, sin actividad registrada"
  }

  if (profile.invitationStatus === "pending") {
    return profile.invitedAt
      ? `Invitada: ${formatDateTime(profile.invitedAt)}`
      : "Invitación pendiente"
  }

  return "Puede recibir una invitación nueva"
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

