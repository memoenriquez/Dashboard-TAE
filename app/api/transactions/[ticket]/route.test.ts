import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createSqlServerTransactionRepositoryMock,
  getTransactionDetailMock,
  recordAuditEventMock,
  resolveTransactionRequestContextMock,
  trustedAuditWriterMock,
} = vi.hoisted(() => ({
  createSqlServerTransactionRepositoryMock: vi.fn(),
  getTransactionDetailMock: vi.fn(),
  recordAuditEventMock: vi.fn(),
  resolveTransactionRequestContextMock: vi.fn(),
  trustedAuditWriterMock: vi.fn(),
}))

vi.mock("@/features/audit/audit-service", () => ({
  recordAuditEvent: recordAuditEventMock,
}))

vi.mock("@/features/transactions/transaction-service", () => ({
  getTransactionDetail: getTransactionDetailMock,
}))

vi.mock("@/lib/external-db/transactions-repository", () => ({
  createSqlServerTransactionRepository: createSqlServerTransactionRepositoryMock,
}))

vi.mock("../../_lib/dashboard-context", () => ({
  recordTrustedAuditEvent: trustedAuditWriterMock,
  resolveTransactionRequestContext: resolveTransactionRequestContextMock,
}))

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
  scope: {
    type: "external_client_ids",
    externalClientIds: [1001],
  },
}

const transaction = {
  ticket: "TICKET-1",
  externalClientId: 1001,
  occurredAt: "2026-01-01T00:00:00.000Z",
  status: "successful",
  operatorName: "Operator",
  productName: "Product",
  phoneNumber: "55555555",
  soldAmount: 100,
  visibleClientName: "Client",
  responseCode: "0",
  responseMessage: "OK",
  apiReference: "ref-1",
}

describe("GET /api/transactions/[ticket]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSqlServerTransactionRepositoryMock.mockReturnValue({})
    resolveTransactionRequestContextMock.mockResolvedValue(dashboardContext)
    getTransactionDetailMock.mockResolvedValue(transaction)
    recordAuditEventMock.mockRejectedValue(new Error("RLS blocked insert"))
    trustedAuditWriterMock.mockRejectedValue(new Error("audit store unavailable"))
  })

  it("returns authorized transaction details even when trusted audit storage fails", async () => {
    const { GET } = await import("./route")

    const response = await GET(new Request("http://localhost/api/transactions/TICKET-1"), {
      params: Promise.resolve({ ticket: "TICKET-1" }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ transaction })
    expect(trustedAuditWriterMock).toHaveBeenCalledWith({
      actorUserId: "user-id",
      actorClientId: "client-id",
      eventType: "transaction_detail_viewed",
      targetType: "transaction",
      targetId: "TICKET-1",
      metadata: {
        externalClientId: 1001,
      },
    })
  })
})
