import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyExternalClientFilterToScopeMock,
  createTaeApiTransactionRepositoryMock,
  listTransactionsMock,
  resolveTransactionRequestContextMock,
} = vi.hoisted(() => ({
  applyExternalClientFilterToScopeMock: vi.fn(),
  createTaeApiTransactionRepositoryMock: vi.fn(),
  listTransactionsMock: vi.fn(),
  resolveTransactionRequestContextMock: vi.fn(),
}))

vi.mock("@/features/clients/scope", () => ({
  applyExternalClientFilterToScope: applyExternalClientFilterToScopeMock,
}))

vi.mock("@/features/transactions/transaction-service", () => ({
  listTransactions: listTransactionsMock,
}))

vi.mock("@/lib/tae-api/transactions-repository", () => ({
  createTaeApiTransactionRepository: createTaeApiTransactionRepositoryMock,
}))

vi.mock("../_lib/dashboard-context", () => ({
  resolveTransactionRequestContext: resolveTransactionRequestContextMock,
}))

const scope = {
  type: "external_client_ids",
  externalClientIds: [1001],
}

const filteredScope = {
  type: "external_client_ids",
  externalClientIds: [1001],
}

describe("GET /api/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTaeApiTransactionRepositoryMock.mockReturnValue({ source: "tae" })
    resolveTransactionRequestContextMock.mockResolvedValue({ scope })
    applyExternalClientFilterToScopeMock.mockReturnValue(filteredScope)
    listTransactionsMock.mockResolvedValue({
      rows: [],
      kpis: { transactionCount: 0, soldAmount: 0 },
      pagination: { page: 1, pageSize: 25, totalRows: 0 },
    })
  })

  it("applies the requested client filter to the resolved scope before listing transactions", async () => {
    const { GET } = await import("./route")

    const response = await GET(
      new Request(
        "http://localhost/api/transactions?from=2026-01-01&to=2026-01-02&externalClientId=1001"
      )
    )

    expect(response.status).toBe(200)
    expect(applyExternalClientFilterToScopeMock).toHaveBeenCalledWith(scope, 1001)
    expect(listTransactionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: { source: "tae" },
        scope: filteredScope,
        page: 1,
        pageSize: 25,
      })
    )
    expect(listTransactionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: filteredScope,
        filters: expect.objectContaining({
          status: "all",
          phoneNumber: null,
          reference: null,
        }),
        page: 1,
        pageSize: 1,
      })
    )
  })
})
