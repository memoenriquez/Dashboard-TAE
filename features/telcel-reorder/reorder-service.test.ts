import { describe, expect, it } from "vitest"

import {
  calculateTelcelReorderPoints,
  percentile,
  roundUp,
  type ReorderResult,
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

  it("when every scenario exceeds the cap, recommends the lowest-exposure routine", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(10_000),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 1_000,
      },
    })

    expect(result.scenarios.every((scenario) => scenario.exceedsCap)).toBe(true)
    expect(result.scenarios[0]).toMatchObject({
      frequency: "4x daily",
      recommended: true,
    })
    expect(result.scenarios[0].targetBalance).toBe(
      Math.min(...result.scenarios.map((scenario) => scenario.targetBalance))
    )
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

  it("keeps one rare outlier from driving p95 when it is below 5% of the window", () => {
    const mostlyNormalDays = Array.from({ length: 20 }, (_, index) =>
      transaction(
        `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
        index === 19 ? 100_000 : 1_000
      )
    )

    const result = calculateTelcelReorderPoints({
      currentTransactions: mostlyNormalDays,
      previousTransactions: [],
      params: {
        ...baseParams,
        dateFrom: new Date("2026-06-01T00:00:00.000Z"),
        dateTo: new Date("2026-06-20T00:00:00.000Z"),
        maxLedgerBalance: 50_000,
      },
    })

    expect(result.aggregateStats.p95DailyDemand).toBe(1_000)
    expect(result.aggregateStats.maxDailyDemand).toBe(100_000)
  })

  it("lets repeated outliers affect p95 when they are common enough", () => {
    const repeatedOutliers = Array.from({ length: 20 }, (_, index) =>
      transaction(
        `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
        index >= 18 ? 100_000 : 1_000
      )
    )

    const result = calculateTelcelReorderPoints({
      currentTransactions: repeatedOutliers,
      previousTransactions: [],
      params: {
        ...baseParams,
        dateFrom: new Date("2026-06-01T00:00:00.000Z"),
        dateTo: new Date("2026-06-20T00:00:00.000Z"),
        maxLedgerBalance: 500_000,
      },
    })

    expect(result.aggregateStats.p95DailyDemand).toBe(100_000)
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

  it("handles a rounding increment larger than the preferred cap with cap warnings", () => {
    const result = calculateTelcelReorderPoints({
      currentTransactions: sevenDailyTransactions(1_000),
      previousTransactions: [],
      params: {
        ...baseParams,
        maxLedgerBalance: 5_000,
        roundingIncrement: 10_000,
      },
    })

    expect(result.scenarios.every((scenario) => scenario.exceedsCap)).toBe(true)
    expect(result.scenarios[0].targetBalance).toBe(10_000)
    expect(result.scenarios[0].capGap).toBe(5_000)
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

describe("calculateTelcelReorderPoints regular operating scenarios", () => {
  const regularScenarios: {
    name: string
    currentTransactions: ReorderTransaction[]
    previousTransactions?: ReorderTransaction[]
    params: typeof baseParams
    expectResult: (result: ReorderResult) => void
  }[] = [
    {
      name: "stable low demand uses a longer cycle under a modest cap",
      currentTransactions: dailyTransactions(Array(14).fill(2_000)),
      params: regularParams(14, { maxLedgerBalance: 20_000, currentBalance: 5_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("every 9 days")
        expect(result.scenarios[0].targetBalance).toBeLessThanOrEqual(20_000)
      },
    },
    {
      name: "stable medium demand fits five days under a 50k cap",
      currentTransactions: dailyTransactions(Array(14).fill(9_300)),
      params: regularParams(14, { maxLedgerBalance: 50_000, currentBalance: 5_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("every 5 days")
      },
    },
    {
      name: "stable high demand shortens the cycle under a 100k cap",
      currentTransactions: dailyTransactions(Array(14).fill(25_000)),
      params: regularParams(14, { maxLedgerBalance: 100_000, currentBalance: 20_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("every 3 days")
      },
    },
    {
      name: "tight cap prefers two-day coverage over daily when it still fits",
      currentTransactions: dailyTransactions(Array(14).fill(9_300)),
      params: regularParams(14, { maxLedgerBalance: 25_000, currentBalance: 5_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("every 2 days")
      },
    },
    {
      name: "current balance above target never recommends adding now",
      currentTransactions: dailyTransactions(Array(14).fill(7_500)),
      params: regularParams(14, { maxLedgerBalance: 60_000, currentBalance: 80_000 }),
      expectResult: (result) => {
        expect(result.currentStatus.status).toBe("above-recommended")
        expect(result.scenarios[0].immediateTopUpAmount).toBe(0)
      },
    },
    {
      name: "current balance below target recommends only the gap",
      currentTransactions: dailyTransactions(Array(14).fill(7_500)),
      params: regularParams(14, { maxLedgerBalance: 60_000, currentBalance: 10_000 }),
      expectResult: (result) => {
        expect(result.currentStatus.status).toBe("below-recommended")
        expect(result.scenarios[0].immediateTopUpAmount).toBe(
          result.scenarios[0].targetBalance - 10_000
        )
      },
    },
    {
      name: "Friday recommendation applies weekend coverage",
      currentTransactions: dailyTransactions([4_000, 4_000, 4_000, 4_000, 15_000, 15_000, 15_000]),
      params: {
        ...baseParams,
        operatingDate: new Date("2026-06-05T00:00:00.000Z"),
        maxLedgerBalance: 80_000,
      },
      expectResult: (result) => {
        expect(result.weekendBuffer).toBe(45_000)
        expect(result.scenarios.some((scenario) => scenario.weekendCarryRequired)).toBe(true)
      },
    },
    {
      name: "Monday recommendation shows weekend buffer but does not apply it",
      currentTransactions: dailyTransactions([4_000, 4_000, 4_000, 4_000, 15_000, 15_000, 15_000]),
      params: {
        ...baseParams,
        operatingDate: new Date("2026-06-01T00:00:00.000Z"),
        maxLedgerBalance: 80_000,
      },
      expectResult: (result) => {
        expect(result.weekendBuffer).toBe(45_000)
        expect(result.scenarios[0].weekendCarryRequired).toBe(false)
      },
    },
    {
      name: "growing demand shows positive p95 trend",
      currentTransactions: dailyTransactions(Array(14).fill(8_000)),
      previousTransactions: previousWindowDailyTransactions(Array(14).fill(5_000)),
      params: regularParams(14, { maxLedgerBalance: 60_000 }),
      expectResult: (result) => {
        expect(result.trendComparison.changePercent).toBeGreaterThan(0)
      },
    },
    {
      name: "declining demand shows negative p95 trend",
      currentTransactions: dailyTransactions(Array(14).fill(5_000)),
      previousTransactions: previousWindowDailyTransactions(Array(14).fill(8_000)),
      params: regularParams(14, { maxLedgerBalance: 60_000 }),
      expectResult: (result) => {
        expect(result.trendComparison.changePercent).toBeLessThan(0)
      },
    },
    {
      name: "sparse but regular usage keeps zero days in the estimate",
      currentTransactions: dailyTransactions([0, 3_000, 0, 3_000, 0, 3_000, 0, 3_000, 0, 3_000, 0, 3_000, 0, 3_000]),
      params: regularParams(14, { maxLedgerBalance: 30_000 }),
      expectResult: (result) => {
        expect(result.aggregateStats.totalDays).toBe(14)
        expect(result.aggregateStats.activeDays).toBe(7)
      },
    },
    {
      name: "two-client demand ranks the larger consumer first",
      currentTransactions: [
        ...dailyTransactions(Array(7).fill(1_000), 1001, "Cliente Chico"),
        ...dailyTransactions(Array(7).fill(4_000), 1002, "Cliente Grande"),
      ],
      params: regularParams(7, { maxLedgerBalance: 60_000 }),
      expectResult: (result) => {
        expect(result.topConsumers[0].clientName).toBe("Cliente Grande")
      },
    },
    {
      name: "500 peso rounding keeps targets on 500 peso increments",
      currentTransactions: dailyTransactions(Array(14).fill(3_333)),
      params: regularParams(14, { maxLedgerBalance: 50_000, roundingIncrement: 500 }),
      expectResult: (result) => {
        expect(result.scenarios[0].targetBalance % 500).toBe(0)
      },
    },
    {
      name: "longer lead time produces a higher target than shorter lead time",
      currentTransactions: dailyTransactions(Array(14).fill(5_000)),
      params: regularParams(14, { maxLedgerBalance: 50_000, leadTimeHours: 4 }),
      expectResult: (result) => {
        const shortLead = calculateTelcelReorderPoints({
          currentTransactions: dailyTransactions(Array(14).fill(5_000)),
          previousTransactions: [],
          params: regularParams(14, { maxLedgerBalance: 50_000, leadTimeHours: 1 }),
        })

        expect(result.scenarios[0].targetBalance).toBeGreaterThan(shortLead.scenarios[0].targetBalance)
      },
    },
    {
      name: "high cap does not exceed history window as max coverage",
      currentTransactions: dailyTransactions(Array(21).fill(2_500)),
      params: regularParams(21, { maxLedgerBalance: 1_000_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("every 21 days")
      },
    },
    {
      name: "cap below daily target falls back to lowest exposure routine",
      currentTransactions: dailyTransactions(Array(14).fill(12_000)),
      params: regularParams(14, { maxLedgerBalance: 5_000 }),
      expectResult: (result) => {
        expect(result.scenarios[0].frequency).toBe("4x daily")
        expect(result.scenarios[0].exceedsCap).toBe(true)
      },
    },
    {
      name: "moderate weekend usage stays under cap on Friday",
      currentTransactions: dailyTransactions([5_000, 5_000, 5_000, 5_000, 8_000, 8_000, 8_000]),
      params: {
        ...baseParams,
        operatingDate: new Date("2026-06-05T00:00:00.000Z"),
        maxLedgerBalance: 40_000,
      },
      expectResult: (result) => {
        expect(result.scenarios[0].exceedsCap).toBe(false)
      },
    },
    {
      name: "current balance equal to target produces zero immediate top-up",
      currentTransactions: dailyTransactions(Array(14).fill(4_000)),
      params: regularParams(14, { maxLedgerBalance: 50_000, currentBalance: 0 }),
      expectResult: (result) => {
        const target = result.scenarios[0].targetBalance
        const secondRun = calculateTelcelReorderPoints({
          currentTransactions: dailyTransactions(Array(14).fill(4_000)),
          previousTransactions: [],
          params: regularParams(14, { maxLedgerBalance: 50_000, currentBalance: target }),
        })

        expect(secondRun.scenarios[0].immediateTopUpAmount).toBe(0)
      },
    },
    {
      name: "weekday hourly average does not sum the whole history into one day",
      currentTransactions: dailyTransactions(Array(14).fill(1_200)),
      params: regularParams(14, { maxLedgerBalance: 50_000 }),
      expectResult: (result) => {
        expect(result.hourlyDemand.find((row) => row.hour === 10)?.demand).toBe(1_200)
      },
    },
    {
      name: "normal demand with 100 peso rounding has no negative values",
      currentTransactions: dailyTransactions([2_000, 2_500, 3_000, 3_500, 4_000, 4_500, 5_000]),
      params: regularParams(7, { maxLedgerBalance: 35_000, currentBalance: 12_000 }),
      expectResult: (result) => {
        result.scenarios.forEach((scenario) => {
          expect(scenario.targetBalance).toBeGreaterThanOrEqual(0)
          expect(scenario.immediateTopUpAmount).toBeGreaterThanOrEqual(0)
          expect(scenario.reorderAmount).toBeGreaterThanOrEqual(0)
        })
      },
    },
  ]

  regularScenarios.forEach((scenario) => {
    it(scenario.name, () => {
      const result = calculateTelcelReorderPoints({
        currentTransactions: scenario.currentTransactions,
        previousTransactions: scenario.previousTransactions ?? [],
        params: scenario.params,
      })

      scenario.expectResult(result)
    })
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

const dailyTransactions = (
  amounts: number[],
  externalClientId = 1001,
  visibleClientName = "Cliente Demo"
) =>
  amounts.flatMap((soldAmount, index) =>
    soldAmount > 0
      ? [
          transaction(
            `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
            soldAmount,
            externalClientId,
            visibleClientName
          ),
        ]
      : []
  )

const previousWindowDailyTransactions = (amounts: number[]) =>
  amounts.flatMap((soldAmount, index) =>
    soldAmount > 0
      ? [
          transaction(
            `2026-05-${String(index + 18).padStart(2, "0")}T10:00:00.000Z`,
            soldAmount
          ),
        ]
      : []
  )

const regularParams = (
  dayCount: number,
  overrides: Partial<typeof baseParams> = {}
): typeof baseParams => ({
  ...baseParams,
  dateTo: new Date(`2026-06-${String(dayCount).padStart(2, "0")}T00:00:00.000Z`),
  ...overrides,
})
