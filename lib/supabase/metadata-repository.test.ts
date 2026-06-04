import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("createDashboardMetadataRepository", () => {
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
