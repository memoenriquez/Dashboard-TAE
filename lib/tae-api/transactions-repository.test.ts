import { describe, expect, it, vi } from "vitest"

import type { TransactionScope } from "@/features/clients/scope"
import type { TransactionFilters } from "@/features/transactions/types"

vi.mock("server-only", () => ({}))

const filters: TransactionFilters = {
  from: new Date("2026-06-03T00:00:00.000Z"),
  to: new Date("2026-06-04T00:00:00.000Z"),
  status: "all",
  phoneNumber: null,
  operatorName: "Telcel",
  reference: null,
  externalClientId: null,
}

describe("createTaeApiTransactionRepository", () => {
  it("fans out only to authorized accounts, merges by fechaHora, paginates globally, and shares KPI work", async () => {
    const getAccountsList = vi.fn().mockResolvedValue([
      { cuentaID: 100, displayName: "Cuenta 100" },
      { cuentaID: 200, displayName: "Cuenta 200" },
    ])
    const getTransactionsList = vi.fn(async ({ cuentaID }: { cuentaID: number }) =>
      cuentaID === 100
        ? [
            createTaeTransaction({
              ticket: "old-approved",
              cuentaID,
              fechaHora: "2026-06-03T10:00:00.000",
              monto: 100,
              codigoRespuesta: "0",
            }),
          ]
        : [
            createTaeTransaction({
              ticket: "new-failed",
              cuentaID,
              fechaHora: "2026-06-03T12:00:00.000",
              monto: 50,
              codigoRespuesta: "3",
            }),
          ]
    )
    const { createTaeApiTransactionRepository } = await import("./transactions-repository")
    const repository = createTaeApiTransactionRepository({
      client: {
        getAccountsList,
        getTransactionsList,
        getBalanceAccount: vi.fn(),
      },
      pageSizePerAccount: 100,
    })

    const scope: TransactionScope = { type: "global" }
    const [rows, kpis] = await Promise.all([
      repository.listTransactions({ scope, filters, page: 1, pageSize: 1 }),
      repository.getTransactionKpis({ scope, filters }),
    ])

    expect(getAccountsList).toHaveBeenCalledWith({ cuentaID: 0 })
    expect(getTransactionsList).toHaveBeenCalledTimes(2)
    expect(getTransactionsList).toHaveBeenCalledWith(
      expect.objectContaining({ cuentaID: 100 })
    )
    expect(getTransactionsList).toHaveBeenCalledWith(
      expect.objectContaining({ cuentaID: 200 })
    )
    expect(rows.map((row) => row.ticket)).toEqual(["new-failed"])
    expect(kpis).toEqual({ transactionCount: 2, soldAmount: 100 })
  })

  it("rejects empty scoped results without calling TAE", async () => {
    const getTransactionsList = vi.fn()
    const { createTaeApiTransactionRepository } = await import("./transactions-repository")
    const repository = createTaeApiTransactionRepository({
      client: {
        getAccountsList: vi.fn(),
        getTransactionsList,
        getBalanceAccount: vi.fn(),
      },
    })

    await expect(
      repository.listTransactions({
        scope: { type: "external_client_ids", externalClientIds: [] },
        filters,
        page: 1,
        pageSize: 25,
      })
    ).resolves.toEqual([])
    expect(getTransactionsList).not.toHaveBeenCalled()
  })

  it("uses scoped external client IDs directly without resolving the global account catalog", async () => {
    const getAccountsList = vi.fn()
    const getTransactionsList = vi.fn().mockResolvedValue([])
    const { createTaeApiTransactionRepository } = await import("./transactions-repository")
    const repository = createTaeApiTransactionRepository({
      client: {
        getAccountsList,
        getTransactionsList,
        getBalanceAccount: vi.fn(),
      },
    })

    await repository.listTransactions({
      scope: { type: "external_client_ids", externalClientIds: [5572667744] },
      filters,
      page: 1,
      pageSize: 25,
    })

    expect(getAccountsList).not.toHaveBeenCalled()
    expect(getTransactionsList).toHaveBeenCalledTimes(1)
    expect(getTransactionsList).toHaveBeenCalledWith(
      expect.objectContaining({ cuentaID: 5572667744 })
    )
  })

  it("rejects fan-out scopes that exceed the configured account limit", async () => {
    const getAccountsList = vi.fn().mockResolvedValue([
      { cuentaID: 100, displayName: "Cuenta 100" },
      { cuentaID: 200, displayName: "Cuenta 200" },
    ])
    const getTransactionsList = vi.fn()
    const { createTaeApiTransactionRepository } = await import("./transactions-repository")
    const repository = createTaeApiTransactionRepository({
      client: {
        getAccountsList,
        getTransactionsList,
        getBalanceAccount: vi.fn(),
      },
      maxAccounts: 1,
    })

    await expect(
      repository.listTransactions({
        scope: { type: "global" },
        filters,
        page: 1,
        pageSize: 25,
      })
    ).rejects.toThrow("TAE transaction query exceeded the configured account limit")
    expect(getTransactionsList).not.toHaveBeenCalled()
  })
})

const createTaeTransaction = (overrides: Partial<TaeTransactionFixture>) => ({
  ticket: "ticket",
  cuentaID: 100,
  fechaHora: "2026-06-03T11:00:00.000",
  telefono: "8111111111",
  sku: "PA100",
  producto: "ASL 100 pesos",
  monto: 100,
  codigoRespuesta: "0",
  descripcion: "Transacción aprobada",
  tokenTransaction: "token-1",
  razonSocial: "Razon Social",
  nombreNegocio: "Negocio",
  ...overrides,
})

interface TaeTransactionFixture {
  ticket: string
  cuentaID: number
  fechaHora: string
  telefono: string
  sku: string
  producto: string
  monto: number
  codigoRespuesta: string
  descripcion: string
  tokenTransaction: string
  razonSocial: string
  nombreNegocio: string
}
