import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("listExternalClients", () => {
  it("maps, searches, and paginates TAE account catalog entries", async () => {
    const getAccountsList = vi.fn().mockResolvedValue([
      { cuentaID: 8100000099, displayName: "CTC" },
      { cuentaID: 5572667744, displayName: "Recarguitas" },
      { cuentaID: 1566574225, displayName: "QuickApp" },
    ])
    const { listExternalClients } = await import("./external-clients-repository")

    const clients = await listExternalClients({
      client: {
        getAccountsList,
        getTransactionsList: vi.fn(),
        getBalanceAccount: vi.fn(),
      },
      search: "rec",
      page: 1,
      pageSize: 25,
    })

    expect(getAccountsList).toHaveBeenCalledWith({ cuentaID: 0 })
    expect(clients).toEqual([
      {
        externalClientId: 5572667744,
        displayName: "Recarguitas",
        transactionCount: 0,
        lastTransactionAt: null,
      },
    ])
  })
})
