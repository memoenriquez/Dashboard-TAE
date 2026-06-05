import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TransactionScope } from "@/features/clients/scope"

import { getAccountBalance, type AccountBalanceRepository } from "./balance-service"

const repository: AccountBalanceRepository = {
  getAccountBalance: vi.fn(async ({ externalClientId }) => ({
    externalClientId,
    balance: 1234.56,
    updatedAt: "2026-06-04T12:00:00.000Z",
  })),
}

describe("getAccountBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the balance for the single account in the authorized scope", async () => {
    const scope: TransactionScope = {
      type: "external_client_ids",
      externalClientIds: [8100000099],
    }

    await expect(getAccountBalance({ repository, scope })).resolves.toEqual({
      externalClientId: 8100000099,
      balance: 1234.56,
      updatedAt: "2026-06-04T12:00:00.000Z",
    })
    expect(repository.getAccountBalance).toHaveBeenCalledWith({
      externalClientId: 8100000099,
    })
  })

  it("requires a specific account before consulting balance", async () => {
    const scopedAccounts: TransactionScope = {
      type: "external_client_ids",
      externalClientIds: [100, 200],
    }

    await expect(getAccountBalance({ repository, scope: scopedAccounts })).rejects.toThrow(
      "Selecciona una cuenta para consultar saldo"
    )
    expect(repository.getAccountBalance).not.toHaveBeenCalled()
  })

  it("does not consult TAE when the authorized scope has no accounts", async () => {
    const emptyScope: TransactionScope = {
      type: "external_client_ids",
      externalClientIds: [],
    }

    await expect(getAccountBalance({ repository, scope: emptyScope })).rejects.toThrow(
      "Selecciona una cuenta para consultar saldo"
    )
    expect(repository.getAccountBalance).not.toHaveBeenCalled()
  })
})
