import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("createTaeApiBalanceRepository", () => {
  it("maps TAE balance data to the dashboard account balance contract", async () => {
    const getBalanceAccount = vi.fn().mockResolvedValue({
      cuentaID: 8100000099,
      balance: 987.65,
      ultimaAct: "2026-06-04T18:00:00.000Z",
    })
    const { createTaeApiBalanceRepository } = await import("./balance-repository")
    const repository = createTaeApiBalanceRepository({
      client: {
        getAccountsList: vi.fn(),
        getTransactionsList: vi.fn(),
        getBalanceAccount,
      },
    })

    await expect(
      repository.getAccountBalance({ externalClientId: 8100000099 })
    ).resolves.toEqual({
      externalClientId: 8100000099,
      balance: 987.65,
      updatedAt: "2026-06-04T18:00:00.000Z",
    })
    expect(getBalanceAccount).toHaveBeenCalledWith({ cuentaID: 8100000099 })
  })
})
