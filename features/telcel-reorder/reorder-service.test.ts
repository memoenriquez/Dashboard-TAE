import { describe, expect, it } from "vitest"

import {
  calculateTelcelReorderPoints,
  percentile,
  roundUp,
  type ReorderTransaction,
} from "./reorder-service"

const baseParams = {
  dateFrom: new Date("2026-06-01T00:00:00.000Z"),
  dateTo: new Date("2026-06-07T00:00:00.000Z"),
  operatingDate: new Date("2026-06-01T00:00:00.000Z"),
  currentBalance: 1_000,
  maxLedgerBalance: 5_000,
  leadTimeHours: 2,
  workingHours: { start: 9, end: 18 },
  roundingIncrement: 100,
  topUpTimes: ["09:00", "14:00"],
}

describe("calculateTelcelReorderPoints", () => {
  it("includes zero-demand days in the p95 daily demand", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [transaction("2026-06-03T10:00:00.000Z", 1_000)],
      previousTransactions: [],
      params: baseParams,
    })

    expect(result.aggregateStats.totalDays).toBe(7)
    expect(result.aggregateStats.activeDays).toBe(1)
    expect(result.aggregateStats.p95DailyDemand).toBe(1_000)
  })

  it("warns instead of invalidating scenarios that exceed the preferred cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-01T10:00:00.000Z", 10_000),
        transaction("2026-06-02T10:00:00.000Z", 10_000),
      ],
      previousTransactions: [],
      params: { ...baseParams, maxLedgerBalance: 5_000 },
    })

    expect(result.scenarios.some((scenario) => scenario.exceedsCap)).toBe(true)
    expect(result.scenarios.find((scenario) => scenario.exceedsCap)?.capGap).toBeGreaterThan(0)
  })

  it("recommends increasing the cap when weekend carry exceeds the preferred cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-05T10:00:00.000Z", 20_000),
        transaction("2026-06-06T10:00:00.000Z", 20_000),
        transaction("2026-06-07T10:00:00.000Z", 20_000),
      ],
      previousTransactions: [],
      params: {
        ...baseParams,
        operatingDate: new Date("2026-06-05T00:00:00.000Z"),
        maxLedgerBalance: 50_000,
      },
    })

    const weekendScenario = result.scenarios.find((scenario) => scenario.weekendCarryRequired)

    expect(weekendScenario?.capNote).toContain("aumenta el límite")
  })

  it("marks low confidence for small samples", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [transaction("2026-06-03T10:00:00.000Z", 1_000)],
      previousTransactions: [],
      params: baseParams,
    })

    expect(result.aggregateStats.confidence).toBe("low")
  })

  it("does not recommend an immediate top-up when current balance already exceeds target", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [transaction("2026-06-03T10:00:00.000Z", 1_000)],
      previousTransactions: [],
      params: { ...baseParams, currentBalance: 30_000 },
    })

    expect(result.scenarios[0].targetBalance).toBeLessThan(30_000)
    expect(result.scenarios[0].immediateTopUpAmount).toBe(0)
  })

  it("treats a very large current balance as above target even when routine scenarios exist", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(9_320),
      previousTransactions: [],
      params: { ...baseParams, currentBalance: 450_000, maxLedgerBalance: 500_000 },
    })

    expect(result.aggregateStats.p95DailyDemand).toBe(9_320)
    expect(result.currentStatus.status).toBe("above-recommended")
    expect(result.currentStatus.difference).toBeGreaterThan(0)
    expect(result.scenarios[0].immediateTopUpAmount).toBe(0)
  })

  it("prefers longer reorder coverage when it stays under the preferred cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(9_320),
      previousTransactions: [],
      params: {
        ...baseParams,
        currentBalance: 5_000,
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.aggregateStats.p95DailyDemand).toBe(9_320)
    expect(result.scenarios[0]).toMatchObject({
      frequency: "every 5 days",
      exceedsCap: false,
      stockoutRisk: "low",
      recommended: true,
    })
  })

  it("generates every-N-day strategies dynamically up to the preferred cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(9_320),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("every 5 days")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 6 days")
  })

  it("uses the history window length as the upper bound for dynamic every-N-day strategies", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(1_000),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 1_000_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("every 7 days")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 8 days")
  })

  it("limits every-N-day strategies when the preferred cap is tighter", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(9_320),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 25_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("every 2 days")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 3 days")
  })

  it("does not generate every-N-day strategies when only one day fits under the cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(9_320),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 11_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 2 days")
  })

  it("does not generate every-N-day strategies when p95 demand is zero", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [],
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.aggregateStats.p95DailyDemand).toBe(0)
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 2 days")
    expect(result.currentStatus.status).toBe("no-data")
  })

  it("keeps rounded dynamic every-N-day scenarios within the preferred cap", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(1_000),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 3_250,
        roundingIncrement: 1_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("every 2 days")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 3 days")
  })

  it("reduces dynamic every-N-day coverage when lead time is large", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(5_000),
      previousTransactions: [],
      params: {
        ...baseParams,
        leadTimeHours: 6,
        maxLedgerBalance: 25_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("every 4 days")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("every 5 days")
  })

  it("uses previous window p95 for trend comparison", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(2_000),
      previousTransactions: previousSevenDailyTransactions(1_000),
      params: baseParams,
    })

    expect(result.trendComparison.currentP95).toBe(2_000)
    expect(result.trendComparison.previousP95).toBe(1_000)
    expect(result.trendComparison.changePercent).toBe(1)
  })

  it("groups top consumers by client and sorts by highest demand share", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-01T10:00:00.000Z", 1_000, 1001, "Cliente Uno"),
        transaction("2026-06-02T10:00:00.000Z", 3_000, 1002, "Cliente Dos"),
        transaction("2026-06-03T10:00:00.000Z", 2_000, 1002, "Cliente Dos"),
      ],
      previousTransactions: [],
      params: baseParams,
    })

    expect(result.topConsumers[0]).toMatchObject({
      externalClientId: 1002,
      clientName: "Cliente Dos",
      totalDemand: 5_000,
    })
    expect(result.topConsumers[0].sharePercent).toBeCloseTo(5 / 6)
  })

  it("recommends only the gap when current balance is below target", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [transaction("2026-06-03T10:00:00.000Z", 1_000)],
      previousTransactions: [],
      params: { ...baseParams, currentBalance: 500, maxLedgerBalance: 50_000 },
    })

    expect(result.scenarios[0].immediateTopUpAmount).toBe(
      result.scenarios[0].targetBalance - 500
    )
  })

  it("does not generate 3x and 4x daily scenarios unless weekday cap pressure requires them", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [transaction("2026-06-03T10:00:00.000Z", 1_000)],
      previousTransactions: [],
      params: { ...baseParams, maxLedgerBalance: 50_000 },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("3x daily")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("4x daily")
  })

  it("generates 3x and 4x daily scenarios when 2x daily exceeds the preferred cap on weekdays", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-01T10:00:00.000Z", 10_000),
        transaction("2026-06-02T10:00:00.000Z", 10_000),
        transaction("2026-06-03T10:00:00.000Z", 10_000),
        transaction("2026-06-04T10:00:00.000Z", 10_000),
      ],
      previousTransactions: [],
      params: { ...baseParams, maxLedgerBalance: 6_000 },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("3x daily")
    expect(result.scenarios.map((scenario) => scenario.frequency)).toContain("4x daily")
  })

  it("uses fraction-based stockout risk thresholds", () => {
    const mostlyQuietDays = Array.from({ length: 20 }, (_, index) =>
      transaction(
        `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
        index === 19 ? 10_000 : 100
      )
    )
    const result = calculateTelcelReorderPoints({
      currentTransactions: mostlyQuietDays,
      previousTransactions: [],
      params: {
        ...baseParams,
        dateFrom: new Date("2026-06-01T00:00:00.000Z"),
        dateTo: new Date("2026-06-20T00:00:00.000Z"),
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.scenarios.some((scenario) => scenario.stockoutRisk !== "low")).toBe(true)
  })

  it("does not recommend higher daily frequency when weekend carry is the cap issue", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-05T10:00:00.000Z", 20_000),
        transaction("2026-06-06T10:00:00.000Z", 20_000),
        transaction("2026-06-07T10:00:00.000Z", 20_000),
      ],
      previousTransactions: [],
      params: {
        ...baseParams,
        operatingDate: new Date("2026-06-05T00:00:00.000Z"),
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("3x daily")
    expect(result.scenarios.map((scenario) => scenario.frequency)).not.toContain("4x daily")
    expect(result.scenarios.some((scenario) => scenario.capNote?.includes("aumenta el límite"))).toBe(true)
  })

  it("does not apply weekend carry to Monday operating targets", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-05T10:00:00.000Z", 20_000),
        transaction("2026-06-06T10:00:00.000Z", 20_000),
        transaction("2026-06-07T10:00:00.000Z", 20_000),
      ],
      previousTransactions: [],
      params: { ...baseParams, operatingDate: new Date("2026-06-01T00:00:00.000Z") },
    })

    const twoDailyScenario = result.scenarios.find(
      (scenario) => scenario.frequency === "2x daily"
    )

    expect(result.weekendBuffer).toBe(60_000)
    expect(twoDailyScenario?.weekendCarryRequired).toBe(false)
    expect(twoDailyScenario?.targetBalance).toBeLessThan(60_000)
  })

  it("applies weekend carry to Friday operating targets", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-05T10:00:00.000Z", 20_000),
        transaction("2026-06-06T10:00:00.000Z", 20_000),
        transaction("2026-06-07T10:00:00.000Z", 20_000),
      ],
      previousTransactions: [],
      params: { ...baseParams, operatingDate: new Date("2026-06-05T00:00:00.000Z") },
    })

    const twoDailyScenario = result.scenarios.find(
      (scenario) => scenario.frequency === "2x daily"
    )

    expect(twoDailyScenario?.weekendCarryRequired).toBe(true)
    expect(twoDailyScenario?.targetBalance).toBe(60_000)
  })

  it("normalizes hourly and weekday demand instead of returning history-window totals", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: [
        transaction("2026-06-01T10:00:00.000Z", 700),
        transaction("2026-06-02T10:00:00.000Z", 700),
        transaction("2026-06-03T10:00:00.000Z", 700),
        transaction("2026-06-04T10:00:00.000Z", 700),
        transaction("2026-06-05T10:00:00.000Z", 700),
        transaction("2026-06-06T10:00:00.000Z", 700),
        transaction("2026-06-07T10:00:00.000Z", 700),
      ],
      previousTransactions: [],
      params: baseParams,
    })

    expect(result.hourlyDemand.find((row) => row.hour === 10)?.demand).toBe(700)
    expect(result.dayOfWeekDemand.find((row) => row.day === "Lun")?.demand).toBe(700)
  })
})

describe("roundUp", () => {
  it("rounds up to the configured increment", () => {
    expect(roundUp(10_001, 100)).toBe(10_100)
  })
})

describe("percentile", () => {
  it("uses nearest-rank percentile", () => {
    expect(percentile([0, 0, 100, 200], 0.95)).toBe(200)
  })
})

const transaction = (
  occurredAt: string,
  soldAmount: number,
  externalClientId = 1001,
  visibleClientName = "Cliente Demo"
): ReorderTransaction => ({
  externalClientId,
  visibleClientName,
  occurredAt,
  soldAmount,
})

const sevenDailyTransactions = (soldAmount: number) =>
  [1, 2, 3, 4, 5, 6, 7].map((day) =>
    transaction(`2026-06-${String(day).padStart(2, "0")}T10:00:00.000Z`, soldAmount)
  )

const previousSevenDailyTransactions = (soldAmount: number) =>
  [25, 26, 27, 28, 29, 30, 31].map((day) =>
    transaction(`2026-05-${String(day).padStart(2, "0")}T10:00:00.000Z`, soldAmount)
  )
