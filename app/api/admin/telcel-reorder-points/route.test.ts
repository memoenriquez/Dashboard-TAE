import { beforeEach, describe, expect, it, vi } from "vitest"

const { resolveTransactionRequestContextMock } = vi.hoisted(() => ({
  resolveTransactionRequestContextMock: vi.fn(),
}))

vi.mock("@/lib/tae-api/transactions-repository", () => ({
  createTaeApiTransactionRepository: vi.fn(),
}))

vi.mock("../../_lib/dashboard-context", () => ({
  resolveTransactionRequestContext: resolveTransactionRequestContextMock,
}))

describe("POST /api/admin/telcel-reorder-points", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveTransactionRequestContextMock.mockResolvedValue({
      scope: { type: "global" },
      resolvedProfile: {
        profile: {
          isInternalAdmin: true,
        },
      },
    })
  })

  it("rejects invalid working-hour ranges", async () => {
    const { POST } = await import("./route")
    const response = await POST(
      new Request("http://localhost/api/admin/telcel-reorder-points", {
        method: "POST",
        body: JSON.stringify({
          dateFrom: "2026-06-01",
          dateTo: "2026-06-07",
          workingStartHour: 18,
          workingEndHour: 9,
        }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "La hora final laboral debe ser mayor a la inicial.",
    })
  })
})
