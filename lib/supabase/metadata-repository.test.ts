import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { createAdminClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
}))

vi.mock("./admin", () => ({
  createAdminClient: createAdminClientMock,
}))

describe("createDashboardMetadataRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("maps profile last_seen_at", async () => {
    const { createDashboardMetadataRepository } = await import("./metadata-repository")
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "profile-1",
          client_id: null,
          is_internal_admin: true,
          display_name: "Admin",
          last_seen_at: "2026-06-23T10:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })
    const repository = createDashboardMetadataRepository({ from } as never)

    await expect(repository.listProfiles()).resolves.toEqual([
      {
        id: "profile-1",
        clientId: null,
        isInternalAdmin: true,
        displayName: "Admin",
        lastSeenAt: "2026-06-23T10:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ])
  })

  it("touches profile last_seen_at through the admin client with a 15 minute throttle", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-23T10:30:00.000Z"))
    const { createDashboardMetadataRepository } = await import("./metadata-repository")
    const or = vi.fn().mockResolvedValue({ error: null })
    const eq = vi.fn().mockReturnValue({ or })
    const update = vi.fn().mockReturnValue({ eq })
    const adminFrom = vi.fn().mockReturnValue({ update })
    createAdminClientMock.mockReturnValue({ from: adminFrom })
    const repository = createDashboardMetadataRepository({ from: vi.fn() } as never)

    await repository.touchProfileLastSeen("user-1")

    expect(adminFrom).toHaveBeenCalledWith("profiles")
    expect(update).toHaveBeenCalledWith({
      last_seen_at: "2026-06-23T10:30:00.000Z",
    })
    expect(eq).toHaveBeenCalledWith("id", "user-1")
    expect(or).toHaveBeenCalledWith(
      "last_seen_at.is.null,last_seen_at.lt.2026-06-23T10:15:00.000Z"
    )
  })

  it("replaces group members through a single atomic RPC", async () => {
    const { createDashboardMetadataRepository } = await import("./metadata-repository")
    const from = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const repository = createDashboardMetadataRepository({ from, rpc } as never)

    await repository.replaceGroupMembers({
      groupId: "group-1",
      childClientIds: ["child-1", "child-2"],
    })

    expect(rpc).toHaveBeenCalledWith("replace_group_members", {
      group_id: "group-1",
      child_client_ids: ["child-1", "child-2"],
    })
    expect(from).not.toHaveBeenCalled()
  })
})
