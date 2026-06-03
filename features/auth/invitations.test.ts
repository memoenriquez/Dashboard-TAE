import { describe, expect, it } from "vitest"

import {
  DashboardInvitationAuthError,
  DashboardInvitationValidationError,
  inviteDashboardUser,
  type DashboardInvitationAuthAdmin,
  type DashboardInvitationRepository,
} from "./invitations"
import type { AuditEventInput } from "@/features/audit/types"
import type { Client, Profile } from "@/features/clients/types"

const baseTimestamp = "2026-01-01T00:00:00.000Z"

const activeClient: Client = {
  id: "client-1",
  externalClientId: 100,
  displayName: "Cliente Demo",
  clientKind: "standalone",
  isActive: true,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
}

const createRepository = (
  client: Client | null = activeClient
): DashboardInvitationRepository & {
  profileWrites: Profile[]
  auditWrites: AuditEventInput[]
} => {
  const profileWrites: Profile[] = []
  const auditWrites: AuditEventInput[] = []

  return {
    profileWrites,
    auditWrites,
    getClientById: async () => client,
    upsertProfile: async (input) => {
      const profile: Profile = {
        id: input.id,
        clientId: input.clientId,
        isInternalAdmin: input.isInternalAdmin,
        displayName: input.displayName,
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
      }
      profileWrites.push(profile)
      return profile
    },
    insertAuditEvent: async (event) => {
      auditWrites.push(event)
    },
  }
}

describe("inviteDashboardUser", () => {
  it("invites a user and creates a non-admin profile linked to the selected client", async () => {
    const invites: Array<{
      email: string
      options: { redirectTo?: string; data?: object }
    }> = []
    const authAdmin: DashboardInvitationAuthAdmin = {
      inviteUserByEmail: async (email, options) => {
        invites.push({ email, options })
        return { userId: "user-1", email }
      },
    }
    const repository = createRepository()

    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: " invitado@example.com ",
          displayName: " Usuario Invitado ",
          clientId: activeClient.id,
        },
      })
    ).resolves.toEqual({
      id: "user-1",
      clientId: activeClient.id,
      isInternalAdmin: false,
      displayName: "Usuario Invitado",
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
    })

    expect(invites).toEqual([
      {
        email: "invitado@example.com",
        options: {
          redirectTo:
            "https://dashboard.example.com/auth/accept-invite",
          data: {
            displayName: "Usuario Invitado",
            dashboardClientId: activeClient.id,
          },
        },
      },
    ])
    expect(repository.profileWrites).toEqual([
      {
        id: "user-1",
        clientId: activeClient.id,
        isInternalAdmin: false,
        displayName: "Usuario Invitado",
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
      },
    ])
    expect(repository.auditWrites).toEqual([
      {
        actorUserId: "admin-1",
        actorClientId: null,
        eventType: "permission_changed",
        targetType: "profile",
        targetId: "user-1",
        metadata: {
          action: "invitation_sent",
          email: "invitado@example.com",
          clientId: activeClient.id,
        },
      },
    ])
  })

  it("rejects invitations for inactive clients", async () => {
    const authAdmin: DashboardInvitationAuthAdmin = {
      inviteUserByEmail: async () => {
        throw new Error("inactive clients should be rejected before inviting")
      },
    }
    const repository = createRepository({ ...activeClient, isActive: false })

    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: "invitado@example.com",
          displayName: "Usuario Invitado",
          clientId: activeClient.id,
        },
      })
    ).rejects.toThrow("Selected client is inactive")
  })

  it("rejects invalid emails as validation errors before inviting", async () => {
    const authAdmin: DashboardInvitationAuthAdmin = {
      inviteUserByEmail: async () => {
        throw new Error("invalid email should be rejected before inviting")
      },
    }
    const repository = createRepository()

    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: "correo-invalido",
          displayName: "Usuario Invitado",
          clientId: activeClient.id,
        },
      })
    ).rejects.toBeInstanceOf(DashboardInvitationValidationError)
  })

  it("rejects missing clients as validation errors", async () => {
    const authAdmin: DashboardInvitationAuthAdmin = {
      inviteUserByEmail: async () => {
        throw new Error("missing clients should be rejected before inviting")
      },
    }
    const repository = createRepository()

    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: "invitado@example.com",
          displayName: "Usuario Invitado",
          clientId: "",
        },
      })
    ).rejects.toThrow("Client is required")
  })

  it("returns an actionable auth provider error when Supabase rejects the invitation", async () => {
    const authAdmin: DashboardInvitationAuthAdmin = {
      inviteUserByEmail: async () => {
        throw new Error("User already invited")
      },
    }
    const repository = createRepository()

    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: "invitado@example.com",
          displayName: "Usuario Invitado",
          clientId: activeClient.id,
        },
      })
    ).rejects.toThrow(DashboardInvitationAuthError)
    await expect(
      inviteDashboardUser({
        authAdmin,
        repository,
        actorUserId: "admin-1",
        actorClientId: null,
        appUrl: "https://dashboard.example.com",
        input: {
          email: "invitado@example.com",
          displayName: "Usuario Invitado",
          clientId: activeClient.id,
        },
      })
    ).rejects.toThrow(
      "No fue posible enviar la invitación. Verifica la configuración de correo de Supabase o intenta con otro correo."
    )

    expect(repository.profileWrites).toEqual([])
    expect(repository.auditWrites).toEqual([])
  })
})
