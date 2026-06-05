import { beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardAccessDeniedError } from "@/features/auth/errors"

const {
  applyExternalClientFilterToScopeMock,
  createTaeApiBalanceRepositoryMock,
  getAccountBalanceMock,
  resolveTransactionRequestContextMock,
} = vi.hoisted(() => ({
  applyExternalClientFilterToScopeMock: vi.fn(),
  createTaeApiBalanceRepositoryMock: vi.fn(),
  getAccountBalanceMock: vi.fn(),
  resolveTransactionRequestContextMock: vi.fn(),
}))

vi.mock("@/features/clients/scope", () => ({
  applyExternalClientFilterToScope: applyExternalClientFilterToScopeMock,
}))

vi.mock("@/features/accounts/balance-service", () => ({
  getAccountBalance: getAccountBalanceMock,
}))

vi.mock("@/lib/tae-api/balance-repository", () => ({
  createTaeApiBalanceRepository: createTaeApiBalanceRepositoryMock,
}))

vi.mock("../../_lib/dashboard-context", () => ({
  resolveTransactionRequestContext: resolveTransactionRequestContextMock,
}))

const scope = {
  type: "external_client_ids",
  externalClientIds: [1001, 1002],
}

const filteredScope = {
  type: "external_client_ids",
  externalClientIds: [1001],
}

describe("GET /api/accounts/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTaeApiBalanceRepositoryMock.mockReturnValue({ source: "tae-balance" })
    resolveTransactionRequestContextMock.mockResolvedValue({ scope })
    applyExternalClientFilterToScopeMock.mockReturnValue(filteredScope)
    getAccountBalanceMock.mockResolvedValue({
      externalClientId: 1001,
      balance: 1234.56,
      updatedAt: "2026-06-04T12:00:00.000Z",
    })
  })

  it("applies the requested client filter before consulting account balance", async () => {
    const { GET } = await import("./route")

    const response = await GET(
      new Request("http://localhost/api/accounts/balance?externalClientId=1001")
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      externalClientId: 1001,
      balance: 1234.56,
      updatedAt: "2026-06-04T12:00:00.000Z",
    })
    expect(applyExternalClientFilterToScopeMock).toHaveBeenCalledWith(scope, 1001)
    expect(getAccountBalanceMock).toHaveBeenCalledWith({
      repository: { source: "tae-balance" },
      scope: filteredScope,
    })
  })

  it("returns a validation error when no account is selected", async () => {
    const { GET } = await import("./route")

    const response = await GET(new Request("http://localhost/api/accounts/balance"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Selecciona una cuenta para consultar saldo.",
    })
    expect(getAccountBalanceMock).not.toHaveBeenCalled()
  })

  it("does not consult balance when the requested account is outside scope", async () => {
    applyExternalClientFilterToScopeMock.mockImplementation(() => {
      throw new DashboardAccessDeniedError()
    })
    const { GET } = await import("./route")

    const response = await GET(
      new Request("http://localhost/api/accounts/balance?externalClientId=9999")
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
    expect(getAccountBalanceMock).not.toHaveBeenCalled()
  })
})
