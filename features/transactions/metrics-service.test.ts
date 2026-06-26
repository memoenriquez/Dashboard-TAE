import { describe, expect, it } from "vitest"

import {
  getTransactionMetrics,
  type TransactionRepository,
} from "./transaction-service"
import type { NormalizedTransactionRecord, TransactionFilters } from "./types"

const filters: TransactionFilters = {
  from: new Date("2026-01-01T00:00:00.000Z"),
  to: new Date("2026-01-31T23:59:59.999Z"),
  status: "all",
  phoneNumber: null,
  operatorName: "Telcel",
  reference: null,
}

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

describe("getTransactionMetrics", () => {
  it("requests the complete filtered row set for metrics", async () => {
    const listTransactionsCalls: Array<{ page: number; pageSize: number }> = []
    const repository: TransactionRepository = {
      listTransactions: async (input) => {
        listTransactionsCalls.push({ page: input.page, pageSize: input.pageSize })
        return []
      },
      getTransactionKpis: async () => ({
        transactionCount: 0,
        soldAmount: 0,
      }),
      getTransactionDetail: async () => null,
    }

    await getTransactionMetrics({
      repository,
      scope: { type: "global" },
      filters,
    })

    expect(listTransactionsCalls).toEqual([
      { page: 1, pageSize: Number.MAX_SAFE_INTEGER },
    ])
  })

  it("calculates executive KPIs from all filtered transactions", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({ ticket: "T-1", soldAmount: 100 }),
        createTransaction({ ticket: "T-2", soldAmount: 50 }),
        createTransaction({
          ticket: "T-3",
          status: "failed",
          soldAmount: 75,
          responseCode: "3",
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 3,
        soldAmount: 150,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters,
      })
    ).resolves.toMatchObject({
      kpis: {
        transactionCount: 3,
        successfulTransactionCount: 2,
        failedTransactionCount: 1,
        soldAmount: 150,
        successRate: 2 / 3,
        averageTicket: 75,
      },
    })
  })

  it("ranks visible clients by sold amount and transaction volume", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "A-1",
          externalClientId: 100,
          visibleClientName: "Cliente A",
          soldAmount: 100,
        }),
        createTransaction({
          ticket: "B-1",
          externalClientId: 200,
          visibleClientName: "Cliente B",
          soldAmount: 60,
        }),
        createTransaction({
          ticket: "B-2",
          externalClientId: 200,
          visibleClientName: "Cliente B",
          soldAmount: 40,
        }),
        createTransaction({
          ticket: "C-1",
          externalClientId: 300,
          visibleClientName: "Cliente C",
          status: "failed",
          soldAmount: 999,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 4,
        soldAmount: 200,
      }),
      getTransactionDetail: async () => null,
    }

    const metrics = await getTransactionMetrics({
      repository,
      scope: { type: "external_client_ids", externalClientIds: [100, 200, 300] },
      filters,
    })

    expect(metrics.topClient).toMatchObject({
      externalClientId: 200,
      visibleClientName: "Cliente B",
      transactionCount: 2,
      soldAmount: 100,
    })
    expect(metrics.clientRanking.map((client) => client.externalClientId)).toEqual([
      200,
      100,
      300,
    ])
  })

  it("returns the consulted client as the top client for single-client metric views", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "A-1",
          externalClientId: 100,
          visibleClientName: "Cliente A",
          soldAmount: 100,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 100,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters,
      })
    ).resolves.toMatchObject({
      topClient: {
        externalClientId: 100,
        visibleClientName: "Cliente A",
        soldAmount: 100,
      },
    })
  })

  it("summarizes successful sales by date and hour to expose trends", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "A-1",
          occurredAt: "2026-01-01T10:15:00.000Z",
          soldAmount: 100,
        }),
        createTransaction({
          ticket: "A-2",
          occurredAt: "2026-01-01T10:45:00.000Z",
          soldAmount: 300,
        }),
        createTransaction({
          ticket: "B-1",
          occurredAt: "2026-01-02T18:00:00.000Z",
          soldAmount: 600,
        }),
        createTransaction({
          ticket: "F-1",
          occurredAt: "2026-01-02T18:30:00.000Z",
          status: "failed",
          soldAmount: 999,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 4,
        soldAmount: 600,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters,
      })
    ).resolves.toMatchObject({
      dailySales: [
        {
          date: "2026-01-01",
          successfulTransactionCount: 2,
          soldAmount: 400,
          averageSale: 200,
        },
        {
          date: "2026-01-02",
          successfulTransactionCount: 1,
              soldAmount: 600,
              averageSale: 600,
        },
      ],
      hourlySales: expect.arrayContaining([
        {
          hour: 10,
          successfulTransactionCount: 2,
          soldAmount: 400,
          averageSale: 200,
        },
        {
          hour: 18,
          successfulTransactionCount: 1,
              soldAmount: 600,
              averageSale: 600,
        },
      ]),
      peakSalesDate: {
            date: "2026-01-02",
            soldAmount: 600,
      },
      peakSalesHour: {
            hour: 18,
            soldAmount: 600,
      },
    })
  })

  it("groups timezone-less transaction timestamps by their published hour", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "A-1",
          occurredAt: "2026-01-01T23:15:00.000",
          soldAmount: 100,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 100,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters,
      })
    ).resolves.toMatchObject({
      hourlySales: [
        {
          hour: 23,
          soldAmount: 100,
        },
      ],
    })
  })

  it("does not report a top client when no successful sales exist", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "F-1",
          status: "failed",
          soldAmount: 999,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 1,
        soldAmount: 0,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "external_client_ids", externalClientIds: [100] },
        filters,
      })
    ).resolves.toMatchObject({
      topClient: null,
    })
  })

  it("calculates sales concentration for the leading clients", async () => {
    const repository: TransactionRepository = {
      listTransactions: async () => [
        createTransaction({
          ticket: "A-1",
          externalClientId: 100,
          visibleClientName: "Cliente A",
          soldAmount: 500,
        }),
        createTransaction({
          ticket: "B-1",
          externalClientId: 200,
          visibleClientName: "Cliente B",
          soldAmount: 300,
        }),
        createTransaction({
          ticket: "C-1",
          externalClientId: 300,
          visibleClientName: "Cliente C",
          soldAmount: 100,
        }),
        createTransaction({
          ticket: "D-1",
          externalClientId: 400,
          visibleClientName: "Cliente D",
          soldAmount: 100,
        }),
      ],
      getTransactionKpis: async () => ({
        transactionCount: 4,
        soldAmount: 1000,
      }),
      getTransactionDetail: async () => null,
    }

    await expect(
      getTransactionMetrics({
        repository,
        scope: { type: "global" },
        filters,
      })
    ).resolves.toMatchObject({
      salesConcentration: {
        topClientShare: 0.5,
        topThreeClientsShare: 0.9,
      },
    })
  })
})
