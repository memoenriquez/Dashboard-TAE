import { describe, expect, it } from "vitest"

import {
  createTransactionsCsv,
  getTransactionDetail,
  listTransactions,
  type TransactionRepository,
} from "./transaction-service"
import type { NormalizedTransactionRecord } from "./types"

const createTransaction = (
  overrides: Partial<NormalizedTransactionRecord>
): NormalizedTransactionRecord => ({
  ticket: "T-1",
  externalClientId: 100,
  visibleClientName: "Cliente Demo",
  occurredAt: "2026-01-01T12:00:00.000Z",
  status: "successful",
  phoneNumber: "5512345678",
  operatorName: "Telcel",
  sku: "TELCEL100",
  productName: "Telcel 100",
  soldAmount: 100,
  responseCode: "0",
  responseMessage: "Operacion exitosa",
  apiReference: "api-token",
  authorization: "125251",
  ...overrides,
})

describe("listTransactions", () => {
  it("returns normalized rows and KPIs for the resolved scope", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({ ticket: "T-1", status: "successful", soldAmount: 100 }),
        createTransaction({ ticket: "T-2", status: "failed", soldAmount: 50 }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 10,
        soldAmount: 900,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      listTransactions({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters: {
          from: new Date("2026-01-01T00:00:00.000Z"),
          to: new Date("2026-01-31T23:59:59.999Z"),
          status: "all",
          phoneNumber: null,
          operatorName: "Telcel",
          reference: null,
        },
        page: 1,
        pageSize: 25,
      })
    ).resolves.toMatchObject({
      kpis: {
        transactionCount: 10,
        soldAmount: 900,
      },
      rows: [
        expect.objectContaining({ ticket: "T-1" }),
        expect.objectContaining({ ticket: "T-2" }),
      ],
    })
  })

  it("loads rows and KPIs without unnecessary sequential orchestration", async () => {
    const events: string[] = []
    const releases: {
      rows?: () => void
      kpis?: () => void
    } = {}
    let markRowsStarted: () => void
    const rowsStarted = new Promise<void>((resolve) => {
      markRowsStarted = resolve
    })
    const repository: TransactionRepository = {
      listTransactions: async () => {
        events.push("rows-started")
        markRowsStarted()
        await new Promise<void>((release) => {
          releases.rows = release
        })
        return []
      },
      getTransactionKpis: async () => {
        events.push("kpis-started")
        await new Promise<void>((release) => {
          releases.kpis = release
        })
        return {
          transactionCount: 0,
          soldAmount: 0,
        }
      },
      getTransactionDetail: async () => null,
    }

    const result = listTransactions({
      repository,
      scope: { type: "global" },
      filters: {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-31T23:59:59.999Z"),
        status: "all",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
      page: 1,
      pageSize: 25,
    })

    await rowsStarted

    expect(events).toEqual(["rows-started", "kpis-started"])
    if (!releases.rows || !releases.kpis) {
      throw new Error("Expected both repository calls to be waiting")
    }

    releases.rows()
    releases.kpis()
    await result
  })
})

describe("getTransactionDetail", () => {
  it("returns null when a ticket is outside the resolved scope", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [],
      getTransactionKpis: async () => ({
        transactionCount: 0,
        soldAmount: 0,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionDetail({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        ticket: "OUTSIDE",
      })
    ).resolves.toBeNull()
  })
})

describe("createTransactionsCsv", () => {
  it("serializes visible rows with a stable header", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [createTransaction({ ticket: "T-1" })],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 100,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      createTransactionsCsv({
        repository,
        scope: { type: "global" },
        filters: {
          from: new Date("2026-01-01T00:00:00.000Z"),
          to: new Date("2026-01-31T23:59:59.999Z"),
          status: "all",
          phoneNumber: null,
          operatorName: "Telcel",
          reference: null,
        },
      })
    ).resolves.toContain(
      "ticket,fecha,estado,operador,producto,telefono,monto_vendido,cliente_visible,codigo_respuesta,mensaje_respuesta,referencia_api,autorizacion"
    )
  })

  it("neutralizes spreadsheet formulas in exported values", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "=CMD",
          visibleClientName: "+Cliente",
          responseMessage: "-error",
          apiReference: "@ref",
          authorization: "=AUTH",
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 100,
      }),
      getTransactionDetail: async () => null,
    }

    const csv = await createTransactionsCsv({
      repository,
      scope: { type: "global" },
      filters: {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-31T23:59:59.999Z"),
        status: "all",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
    })

    expect(csv).toContain("'=CMD")
    expect(csv).toContain("'+Cliente")
    expect(csv).toContain("'-error")
    expect(csv).toContain("'@ref")
    expect(csv).toContain("'=AUTH")
  })

  it("exports an empty authorization column when authorization is absent", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [createTransaction({ authorization: null })],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 100,
      }),
      getTransactionDetail: async () => null,
    }

    const csv = await createTransactionsCsv({
      repository,
      scope: { type: "global" },
      filters: {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-31T23:59:59.999Z"),
        status: "all",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
    })

    expect(csv.split("\n")[1]).toMatch(/,$/)
  })
})
