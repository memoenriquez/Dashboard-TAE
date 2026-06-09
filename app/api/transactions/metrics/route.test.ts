import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyExternalClientFilterToScopeMock,
  createTaeApiTransactionRepositoryMock,
  getTransactionMetricsMock,
  resolveTransactionRequestContextMock,
} = vi.hoisted(() => ({
  applyExternalClientFilterToScopeMock: vi.fn(),
  createTaeApiTransactionRepositoryMock: vi.fn(),
  getTransactionMetricsMock: vi.fn(),
  resolveTransactionRequestContextMock: vi.fn(),
}))

vi.mock("@/features/clients/scope", () => ({
  applyExternalClientFilterToScope: applyExternalClientFilterToScopeMock,
}))

vi.mock("@/features/transactions/transaction-service", () => ({
  getTransactionMetrics: getTransactionMetricsMock,
}))

vi.mock("@/lib/tae-api/transactions-repository", () => ({
  createTaeApiTransactionRepository: createTaeApiTransactionRepositoryMock,
}))

vi.mock("../../_lib/dashboard-context", () => ({
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

describe("GET /api/transactions/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTaeApiTransactionRepositoryMock.mockReturnValue({ source: "tae" })
    resolveTransactionRequestContextMock.mockResolvedValue({
      scope,
      resolvedProfile: {
        profile: {
          isInternalAdmin: true,
        },
      },
    })
    applyExternalClientFilterToScopeMock.mockReturnValue(filteredScope)
    getTransactionMetricsMock.mockResolvedValue({
      kpis: {
        transactionCount: 0,
        successfulTransactionCount: 0,
        failedTransactionCount: 0,
        soldAmount: 0,
        successRate: 0,
        averageTicket: 0,
      },
      topClient: null,
      clientRanking: [],
      dailySales: [],
      hourlySales: [],
      peakSalesDate: null,
      peakSalesHour: null,
      salesConcentration: {
        topClientShare: 0,
        topThreeClientsShare: 0,
      },
    })
  })

  it("applies the requested client filter to the resolved scope before calculating metrics", async () => {
    const { GET } = await import("./route")

    const response = await GET(
      new Request(
        "http://localhost/api/transactions/metrics?from=2026-01-01&to=2026-01-02&externalClientId=1001"
      )
    )

    expect(response.status).toBe(200)
    expect(applyExternalClientFilterToScopeMock).toHaveBeenCalledWith(scope, 1001)
    expect(getTransactionMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: { source: "tae" },
        scope: filteredScope,
      })
    )
  })

  it("rejects authenticated non-admin users before calculating metrics", async () => {
    resolveTransactionRequestContextMock.mockResolvedValue({
      scope,
      resolvedProfile: {
        profile: {
          isInternalAdmin: false,
        },
      },
    })
    const { GET } = await import("./route")

    const response = await GET(
      new Request("http://localhost/api/transactions/metrics?from=2026-01-01&to=2026-01-02")
    )

    expect(response.status).toBe(403)
    expect(getTransactionMetricsMock).not.toHaveBeenCalled()
  })
})
