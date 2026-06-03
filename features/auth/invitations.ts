import type { AuditEventInput } from "@/features/audit/types"
import type { Client, Profile } from "@/features/clients/types"
import type { UpsertProfileInput } from "@/lib/supabase/metadata-repository"

export interface DashboardInvitationInput {
  email: string
  displayName: string
  clientId: string
}

export interface DashboardInvitationAuthAdmin {
  inviteUserByEmail: (
    email: string,
    options: { redirectTo?: string; data?: object }
  ) => Promise<{ userId: string; email: string | null }>
}

export interface DashboardInvitationRepository {
  getClientById: (clientId: string) => Promise<Client | null>
  upsertProfile: (input: UpsertProfileInput) => Promise<Profile>
  insertAuditEvent: (event: AuditEventInput) => Promise<void>
}

export class DashboardInvitationValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DashboardInvitationValidationError"
  }
}

export class DashboardInvitationAuthError extends Error {
  constructor(
    message = "No fue posible enviar la invitación. Verifica la configuración de correo de Supabase o intenta con otro correo."
  ) {
    super(message)
    this.name = "DashboardInvitationAuthError"
  }
}

interface InviteDashboardUserParams {
  authAdmin: DashboardInvitationAuthAdmin
  repository: DashboardInvitationRepository
  actorUserId: string
  actorClientId: string | null
  appUrl: string
  input: DashboardInvitationInput
}

export const inviteDashboardUser = async ({
  authAdmin,
  repository,
  actorUserId,
  actorClientId,
  appUrl,
  input,
}: InviteDashboardUserParams) => {
  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim()
  const clientId = input.clientId.trim()

  if (!isValidEmail(email)) {
    throw new DashboardInvitationValidationError("A valid email is required")
  }

  if (!displayName) {
    throw new DashboardInvitationValidationError("Display name is required")
  }

  if (!clientId) {
    throw new DashboardInvitationValidationError("Client is required")
  }

  const client = await repository.getClientById(clientId)

  if (!client) {
    throw new DashboardInvitationValidationError("Selected client does not exist")
  }

  if (!client.isActive) {
    throw new DashboardInvitationValidationError("Selected client is inactive")
  }

  const invitedUser = await inviteWithActionableError(authAdmin, email, {
    redirectTo: createInviteRedirectUrl(appUrl),
    data: {
      displayName,
      dashboardClientId: clientId,
    },
  })

  const profile = await repository.upsertProfile({
    id: invitedUser.userId,
    clientId,
    isInternalAdmin: false,
    displayName,
  })

  await repository.insertAuditEvent({
    actorUserId,
    actorClientId,
    eventType: "permission_changed",
    targetType: "profile",
    targetId: profile.id,
    metadata: {
      action: "invitation_sent",
      email,
      clientId,
    },
  })

  return profile
}

export const createInviteRedirectUrl = (appUrl: string) => {
  const origin = new URL(normalizeAppUrl(appUrl)).origin
  return `${origin}/auth/accept-invite`
}

const normalizeAppUrl = (appUrl: string) => {
  if (!appUrl.trim()) {
    throw new Error("Application URL is required")
  }

  return appUrl.endsWith("/") ? appUrl : `${appUrl}/`
}

const inviteWithActionableError = async (
  authAdmin: DashboardInvitationAuthAdmin,
  email: string,
  options: { redirectTo?: string; data?: object }
) => {
  try {
    return await authAdmin.inviteUserByEmail(email, options)
  } catch {
    throw new DashboardInvitationAuthError()
  }
}

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email)
