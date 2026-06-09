import { describe, expect, it } from "vitest"

import {
  toClientRankingChartData,
  toDailySalesChartData,
  toHourlySalesChartData,
} from "./metrics-chart-data"

describe("metrics chart data helpers", () => {
  it("maps daily sales into chart-ready labels and values", () => {
    expect(
      toDailySalesChartData([
        {
          date: "2026-01-01",
          soldAmount: 400,
          averageSale: 200,
          successfulTransactionCount: 2,
        },
      ])
    ).toEqual([
      {
        label: "01 ene",
        soldAmount: 400,
        averageSale: 200,
        successfulTransactionCount: 2,
      },
    ])
  })

  it("maps hourly sales preserving hour order labels", () => {
    expect(
      toHourlySalesChartData([
        {
          hour: 9,
          soldAmount: 100,
          averageSale: 50,
          successfulTransactionCount: 2,
        },
      ])
    ).toEqual([
      {
        label: "09 hrs",
        soldAmount: 100,
        averageSale: 50,
        successfulTransactionCount: 2,
      },
    ])
  })

  it("limits client ranking chart data to the leading clients", () => {
    expect(
      toClientRankingChartData(
        Array.from({ length: 7 }, (_, index) => ({
          externalClientId: index + 1,
          visibleClientName: `Cliente ${index + 1}`,
          transactionCount: 1,
          successfulTransactionCount: 1,
          failedTransactionCount: 0,
          soldAmount: 100 - index,
          successRate: 1,
          averageTicket: 100 - index,
        }))
      )
    ).toHaveLength(5)
  })
})
