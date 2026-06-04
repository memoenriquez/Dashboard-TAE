import { beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardAccessDeniedError } from "@/features/auth/errors"

import { DashboardUnauthorizedError } from "../../_lib/errors"

const {
  assertInternalAdminContextMock,
  getClientByIdMock,
  listProfilesMock,
  upsertProfileMock,
} = vi.hoisted(() => ({
  assertInternalAdminContextMock: vi.fn(),
  getClientByIdMock: vi.fn(),
  listProfilesMock: vi.fn(),
  upsertProfileMock: vi.fn(),
}))

vi.mock("../../_lib/dashboard-context", () => ({
  assertInternalAdminContext: assertInternalAdminContextMock,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: vi.fn(),
      },
    },
  })),
}))

vi.mock("@/features/audit/audit-service", () => ({
  recordAuditEvent: vi.fn(),
}))

const adminProfile = {
  id: "admin-user-id",
  clientId: null,
  isInternalAdmin: true,
  displayName: "Admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const activeClient = {
  id: "active-client-id",
  externalClientId: 1001,
  displayName: "Active Client",
  clientKind: "standalone",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const inactiveClient = {
  ...activeClient,
  id: "inactive-client-id",
  displayName: "Inactive Client",
  isActive: false,
}

const createContext = () => ({
  user: { id: adminProfile.id },
  resolvedProfile: {
    profile: adminProfile,
    client: null,
  },
  metadataRepository: {
    getClientById: getClientByIdMock,
    listProfiles: listProfilesMock,
    upsertProfile: upsertProfileMock,
  },
})

const createProfileRequest = (body: object) =>
  new Request("http://localhost/api/admin/profiles", {
    method: "POST",
    body: JSON.stringify(body),
  })

describe("POST /api/admin/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertInternalAdminContextMock.mockResolvedValue(createContext())
    upsertProfileMock.mockResolvedValue({
      id: "client-user-id",
      clientId: activeClient.id,
      isInternalAdmin: false,
      displayName: "Client User",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
  })

  it("returns 401 when the request is unauthenticated", async () => {
    assertInternalAdminContextMock.mockRejectedValue(new DashboardUnauthorizedError())
    const { POST } = await import("./route")

    const response = await POST(
      createProfileRequest({
        id: "client-user-id",
        displayName: "Client User",
        clientId: activeClient.id,
      })
    )

    expect(response.status).toBe(401)
  })

  it("returns 403 when the authenticated user is not an internal admin", async () => {
    assertInternalAdminContextMock.mockRejectedValue(new DashboardAccessDeniedError())
    const { POST } = await import("./route")

    const response = await POST(
      createProfileRequest({
        id: "client-user-id",
        displayName: "Client User",
        clientId: activeClient.id,
      })
    )

    expect(response.status).toBe(403)
  })

  it("rejects non-admin profiles linked to inactive clients", async () => {
    getClientByIdMock.mockResolvedValue(inactiveClient)
    const { POST } = await import("./route")

    const response = await POST(
      createProfileRequest({
        id: "client-user-id",
        displayName: "Client User",
        clientId: inactiveClient.id,
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Selected client is inactive",
    })
    expect(upsertProfileMock).not.toHaveBeenCalled()
  })

  it("validates active clients before creating non-admin profiles", async () => {
    getClientByIdMock.mockResolvedValue(activeClient)
    const { POST } = await import("./route")

    const response = await POST(
      createProfileRequest({
        id: "client-user-id",
        displayName: "Client User",
        clientId: activeClient.id,
      })
    )

    expect(response.status).toBe(201)
    expect(getClientByIdMock).toHaveBeenCalledWith(activeClient.id)
    expect(upsertProfileMock).toHaveBeenCalledWith({
      id: "client-user-id",
      clientId: activeClient.id,
      isInternalAdmin: false,
      displayName: "Client User",
    })
  })
})
