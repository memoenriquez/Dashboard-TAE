import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyExternalClientFilterToScopeMock,
  createTaeApiTransactionRepositoryMock,
  createTransactionsCsvMock,
  recordAuditEventMock,
  resolveTransactionRequestContextMock,
  trustedAuditWriterMock,
} = vi.hoisted(() => ({
  applyExternalClientFilterToScopeMock: vi.fn(),
  createTaeApiTransactionRepositoryMock: vi.fn(),
  createTransactionsCsvMock: vi.fn(),
  recordAuditEventMock: vi.fn(),
  resolveTransactionRequestContextMock: vi.fn(),
  trustedAuditWriterMock: vi.fn(),
}))

vi.mock("@/features/audit/audit-service", () => ({
  recordAuditEvent: recordAuditEventMock,
}))

vi.mock("@/features/clients/scope", () => ({
  applyExternalClientFilterToScope: applyExternalClientFilterToScopeMock,
}))

vi.mock("@/features/transactions/transaction-service", () => ({
  createTransactionsCsv: createTransactionsCsvMock,
}))

vi.mock("@/lib/tae-api/transactions-repository", () => ({
  createTaeApiTransactionRepository: createTaeApiTransactionRepositoryMock,
}))

vi.mock("../../_lib/dashboard-context", () => ({
  recordTrustedAuditEvent: trustedAuditWriterMock,
  resolveTransactionRequestContext: resolveTransactionRequestContextMock,
}))

const scope = {
  type: "external_client_ids",
  externalClientIds: [1001],
}

const dashboardContext = {
  user: { id: "user-id" },
  resolvedProfile: {
    profile: {
      id: "user-id",
      clientId: "client-id",
      isInternalAdmin: false,
      displayName: "Client User",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    client: null,
  },
  metadataRepository: {
    insertAuditEvent: vi.fn(),
  },
  scope,
}

describe("GET /api/transactions/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTaeApiTransactionRepositoryMock.mockReturnValue({})
    resolveTransactionRequestContextMock.mockResolvedValue(dashboardContext)
    applyExternalClientFilterToScopeMock.mockReturnValue(scope)
    createTransactionsCsvMock.mockResolvedValue("ticket,fecha\nTICKET-1,2026-01-01")
    recordAuditEventMock.mockRejectedValue(new Error("RLS blocked insert"))
    trustedAuditWriterMock.mockRejectedValue(new Error("audit store unavailable"))
  })

  it("returns the CSV export even when trusted audit storage fails", async () => {
    const { GET } = await import("./route")

    const response = await GET(
      new Request(
        "http://localhost/api/transactions/export?from=2026-01-01&to=2026-01-02"
      )
    )

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe("ticket,fecha\nTICKET-1,2026-01-01")
    expect(trustedAuditWriterMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-id",
        actorClientId: "client-id",
        eventType: "csv_exported",
        targetType: "transactions",
        targetId: null,
      })
    )
  })
})
