export interface ReorderTransaction {
  externalClientId: number
  visibleClientName: string
  occurredAt: string
  soldAmount: number
}

export interface ReorderParams {
  dateFrom: Date
  dateTo: Date
  operatingDate: Date
  currentBalance: number
  maxLedgerBalance: number
  leadTimeHours: number
  workingHours: {
    start: number
    end: number
  }
  roundingIncrement: number
  topUpTimes: string[]
}

export interface ReorderResult {
  aggregateStats: {
    p95DailyDemand: number
    meanDailyDemand: number
    maxDailyDemand: number
    totalDays: number
    activeDays: number
    sampleSize: number
    confidence: "low" | "medium" | "high"
  }
  hourlyDemand: { hour: number; demand: number }[]
  dayOfWeekDemand: { day: string; demand: number }[]
  peakHoursByPeriod: { period: string; peakHour: number; peakDemand: number }[]
  trendComparison: {
    currentP95: number
    previousP95: number
    changePercent: number
  }
  topConsumers: {
    externalClientId: number
    clientName: string
    totalDemand: number
    sharePercent: number
  }[]
  weekendBuffer: number
  currentStatus: {
    currentBalance: number
    recommendedTargetBalance: number
    difference: number
    status: "no-data" | "below-recommended" | "above-recommended"
  }
  scenarios: ReorderScenario[]
}

export interface ReorderScenario {
  frequency: string
  periodsPerDay: number
  reorderPoint: number
  targetBalance: number
  immediateTopUpAmount: number
  reorderAmount: number
  leadTimeBuffer: number
  totalExposure: number
  weekendCarryBuffer: number
  weekendCarryRequired: boolean
  estimatedMissedSalesPercent: number
  stockoutRisk: "low" | "medium" | "high"
  exceedsCap: boolean
  capGap: number
  rankingScore: number
  recommended: boolean
  capNote?: string
}

export const calculateTelcelReorderPoints = (input: {
  currentTransactions: ReorderTransaction[]
  previousTransactions: ReorderTransaction[]
  params: ReorderParams
}): ReorderResult => {
  const days = listDateKeys(input.params.dateFrom, input.params.dateTo)
  const dailyDemand = calculateDailyDemand(input.currentTransactions, days)
  const previousDays = listPreviousDateKeys(input.params.dateFrom, days.length)
  const previousDailyDemand = calculateDailyDemand(input.previousTransactions, previousDays)
  const hourlyDemand = calculateHourlyDemand(input.currentTransactions, days.length)
  const totalDemand = dailyDemand.reduce((total, day) => total + day.demand, 0)
  const p95DailyDemand = percentile(dailyDemand.map((day) => day.demand), 0.95)
  const scenarios = rankScenarios(
    createScenarios({
      dailyDemand: dailyDemand.map((day) => day.demand),
      p95DailyDemand,
      params: input.params,
      weekendBuffer: calculateWeekendBuffer(dailyDemand),
      applyWeekendBuffer: shouldApplyWeekendBuffer(input.params.operatingDate),
    })
  )
  const recommendedScenario = scenarios.find((scenario) => scenario.recommended) ?? scenarios[0]
  const difference = input.params.currentBalance - (recommendedScenario?.targetBalance ?? 0)

  return {
    aggregateStats: {
      p95DailyDemand,
      meanDailyDemand: days.length === 0 ? 0 : totalDemand / days.length,
      maxDailyDemand: Math.max(0, ...dailyDemand.map((day) => day.demand)),
      totalDays: days.length,
      activeDays: dailyDemand.filter((day) => day.demand > 0).length,
      sampleSize: input.currentTransactions.length,
      confidence: getConfidence(input.currentTransactions.length, days.length),
    },
    hourlyDemand,
    dayOfWeekDemand: calculateDayOfWeekDemand(dailyDemand),
    peakHoursByPeriod: calculatePeakHoursByPeriod(
      hourlyDemand,
      input.params.topUpTimes,
      input.params.workingHours
    ),
    trendComparison: {
      currentP95: p95DailyDemand,
      previousP95: percentile(previousDailyDemand.map((day) => day.demand), 0.95),
      changePercent: calculatePercentChange(
        percentile(previousDailyDemand.map((day) => day.demand), 0.95),
        p95DailyDemand
      ),
    },
    topConsumers: calculateTopConsumers(input.currentTransactions, totalDemand),
    weekendBuffer: calculateWeekendBuffer(dailyDemand),
    currentStatus: {
      currentBalance: input.params.currentBalance,
      recommendedTargetBalance: recommendedScenario?.targetBalance ?? 0,
      difference,
      status:
        input.currentTransactions.length === 0
          ? "no-data"
          : difference < 0
            ? "below-recommended"
            : "above-recommended",
    },
    scenarios,
  }
}

const createScenarios = (input: {
  dailyDemand: number[]
  p95DailyDemand: number
  params: ReorderParams
  weekendBuffer: number
  applyWeekendBuffer: boolean
}) => {
  const baseScenarios = [
    { frequency: "2x daily", daysCovered: 0.5, periodsPerDay: 2 },
    { frequency: "daily", daysCovered: 1, periodsPerDay: 1 },
    ...createEveryDayScenarios(input),
  ]
  const baseResults = baseScenarios.map((scenario) => calculateScenario(input, scenario))
  const twoDailyScenario = baseResults.find((scenario) => scenario.frequency === "2x daily")
  const extraDailyScenarios =
    twoDailyScenario?.exceedsCap && !twoDailyScenario.weekendCarryRequired
      ? [3, 4].map((periodsPerDay) => ({
          frequency: `${periodsPerDay}x daily`,
          daysCovered: 1 / periodsPerDay,
          periodsPerDay,
        }))
      : []
  const scenarios = [
    ...baseResults,
    ...extraDailyScenarios.map((scenario) => calculateScenario(input, scenario)),
  ]

  return scenarios.filter(
    (scenario, index, all) =>
      all.findIndex((candidate) => candidate.frequency === scenario.frequency) === index
  )
}

const createEveryDayScenarios = (input: {
  dailyDemand: number[]
  p95DailyDemand: number
  params: ReorderParams
  weekendBuffer: number
  applyWeekendBuffer: boolean
}) => {
  if (input.p95DailyDemand <= 0) {
    return []
  }

  const workingDayHours = Math.max(
    1,
    input.params.workingHours.end - input.params.workingHours.start
  )
  const leadTimeBuffer = input.p95DailyDemand * (input.params.leadTimeHours / workingDayHours)
  const maxDaysByHistory = Math.max(1, input.dailyDemand.length)

  return Array.from({ length: Math.max(0, maxDaysByHistory - 1) }, (_, index) => {
    const daysCovered = index + 2
    const targetBalance = roundUp(
      input.p95DailyDemand * daysCovered + leadTimeBuffer,
      input.params.roundingIncrement
    )

    if (targetBalance > input.params.maxLedgerBalance) {
      return null
    }

    return {
      frequency: `every ${daysCovered} days`,
      daysCovered,
      periodsPerDay: 1 / daysCovered,
    }
  }).filter((scenario): scenario is NonNullable<typeof scenario> => scenario !== null)
}

const calculateScenario = (
  input: {
    dailyDemand: number[]
    p95DailyDemand: number
    params: ReorderParams
    weekendBuffer: number
    applyWeekendBuffer: boolean
  },
  scenario: { frequency: string; daysCovered: number; periodsPerDay: number }
): ReorderScenario => {
  const baseTarget = input.p95DailyDemand * scenario.daysCovered
  const workingDayHours = Math.max(
    1,
    input.params.workingHours.end - input.params.workingHours.start
  )
  const leadTimeBuffer = input.p95DailyDemand * (input.params.leadTimeHours / workingDayHours)
  const weekendCarryRequired = input.applyWeekendBuffer && input.weekendBuffer > baseTarget
  const targetBalance = roundUp(
    Math.max(baseTarget + leadTimeBuffer, input.applyWeekendBuffer ? input.weekendBuffer : 0),
    input.params.roundingIncrement
  )
  const reorderPoint = roundUp(leadTimeBuffer, input.params.roundingIncrement)
  const immediateTopUpAmount = Math.max(0, targetBalance - input.params.currentBalance)
  const reorderAmount = Math.max(0, targetBalance - reorderPoint)
  const exceedsCap = targetBalance > input.params.maxLedgerBalance
  const capGap = Math.max(0, targetBalance - input.params.maxLedgerBalance)
  const missedSalesPercent = calculateMissedSalesPercent(
    input.dailyDemand,
    targetBalance,
    scenario.daysCovered
  )

  return {
    frequency: scenario.frequency,
    periodsPerDay: scenario.periodsPerDay,
    reorderPoint,
    targetBalance,
    immediateTopUpAmount,
    reorderAmount,
    leadTimeBuffer: roundUp(leadTimeBuffer, input.params.roundingIncrement),
    totalExposure: targetBalance,
    weekendCarryBuffer: input.weekendBuffer,
    weekendCarryRequired,
    estimatedMissedSalesPercent: missedSalesPercent,
    stockoutRisk:
      missedSalesPercent > 0.1 ? "high" : missedSalesPercent > 0.03 ? "medium" : "low",
    exceedsCap,
    capGap,
    rankingScore: targetBalance + missedSalesPercent * 1_000 + (exceedsCap ? capGap * 2 : 0),
    recommended: false,
    capNote: getCapNote({
      capGap,
      exceedsCap,
      frequency: scenario.frequency,
      weekendCarryRequired,
    }),
  }
}

const rankScenarios = (scenarios: ReorderScenario[]) => {
  const ranked = [...scenarios].sort((first, second) => {
    if (first.exceedsCap !== second.exceedsCap) {
      return first.exceedsCap ? 1 : -1
    }

    if (first.exceedsCap && second.exceedsCap) {
      if (first.totalExposure !== second.totalExposure) {
        return first.totalExposure - second.totalExposure
      }

      return second.periodsPerDay - first.periodsPerDay
    }

    const riskDelta = getRiskRank(first.stockoutRisk) - getRiskRank(second.stockoutRisk)

    if (riskDelta !== 0) {
      return riskDelta
    }

    if (first.periodsPerDay !== second.periodsPerDay) {
      return first.periodsPerDay - second.periodsPerDay
    }

    return first.totalExposure - second.totalExposure
  })

  return ranked.map((scenario, index) => ({
    ...scenario,
    recommended: index === 0,
  }))
}

const getRiskRank = (risk: ReorderScenario["stockoutRisk"]) => {
  if (risk === "low") {
    return 0
  }

  if (risk === "medium") {
    return 1
  }

  return 2
}

const calculateDailyDemand = (transactions: ReorderTransaction[], days: string[]) => {
  const demandByDay = new Map(days.map((day) => [day, 0]))

  transactions.forEach((transaction) => {
    const day = transaction.occurredAt.slice(0, 10)
    demandByDay.set(day, (demandByDay.get(day) ?? 0) + transaction.soldAmount)
  })

  return days.map((day) => ({
    day,
    demand: demandByDay.get(day) ?? 0,
  }))
}

const calculateHourlyDemand = (transactions: ReorderTransaction[], dayCount: number) => {
  const demand = Array.from({ length: 24 }, (_, hour) => ({ hour, demand: 0 }))

  transactions.forEach((transaction) => {
    const hour = Number(transaction.occurredAt.slice(11, 13))

    if (Number.isInteger(hour) && demand[hour]) {
      demand[hour].demand += transaction.soldAmount
    }
  })

  return demand.map((entry) => ({
    ...entry,
    demand: dayCount === 0 ? 0 : entry.demand / dayCount,
  }))
}

const calculateDayOfWeekDemand = (dailyDemand: { day: string; demand: number }[]) => {
  const labels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
  const demand = labels.map((day) => ({ day, demand: 0, dayCount: 0 }))

  dailyDemand.forEach((entry) => {
    const dayIndex = new Date(`${entry.day}T00:00:00.000Z`).getUTCDay()
    demand[dayIndex].demand += entry.demand
    demand[dayIndex].dayCount += 1
  })

  return demand.map((entry) => ({
    day: entry.day,
    demand: entry.dayCount === 0 ? 0 : entry.demand / entry.dayCount,
  }))
}

const calculatePeakHoursByPeriod = (
  hourlyDemand: { hour: number; demand: number }[],
  topUpTimes: string[],
  workingHours: { start: number; end: number }
) => {
  const startHour = Math.min(workingHours.start, workingHours.end)
  const endHour = Math.max(workingHours.start, workingHours.end)
  const sortedHours = topUpTimes
    .map((time) => Number(time.slice(0, 2)))
    .filter(
      (hour) =>
        Number.isInteger(hour) && hour > startHour && hour < endHour && hour >= 0 && hour <= 23
    )
    .sort((first, second) => first - second)
  const boundaries = [startHour, ...sortedHours, endHour]

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    const peak = hourlyDemand
      .filter((entry) => entry.hour >= start && entry.hour < end)
      .sort((first, second) => second.demand - first.demand)[0] ?? { hour: start, demand: 0 }

    return {
      period: `${String(start).padStart(2, "0")}:00-${String(end).padStart(2, "0")}:00`,
      peakHour: peak.hour,
      peakDemand: peak.demand,
    }
  })
}

const calculateTopConsumers = (
  transactions: ReorderTransaction[],
  totalDemand: number
) => {
  const clients = new Map<number, { name: string; demand: number }>()

  transactions.forEach((transaction) => {
    const current = clients.get(transaction.externalClientId) ?? {
      name: transaction.visibleClientName,
      demand: 0,
    }
    clients.set(transaction.externalClientId, {
      name: current.name,
      demand: current.demand + transaction.soldAmount,
    })
  })

  return Array.from(clients.entries())
    .map(([externalClientId, client]) => ({
      externalClientId,
      clientName: client.name,
      totalDemand: client.demand,
      sharePercent: totalDemand === 0 ? 0 : client.demand / totalDemand,
    }))
    .sort((first, second) => second.totalDemand - first.totalDemand)
    .slice(0, 10)
}

const calculateWeekendBuffer = (dailyDemand: { day: string; demand: number }[]) => {
  const fridayToSundayWindows = dailyDemand
    .map((entry, index) => {
      const day = new Date(`${entry.day}T00:00:00.000Z`).getUTCDay()

      if (day !== 5) {
        return 0
      }

      return dailyDemand
        .slice(index, index + 3)
        .reduce((total, current) => total + current.demand, 0)
    })
    .filter((demand) => demand > 0)

  return percentile(fridayToSundayWindows, 0.95)
}

const calculateMissedSalesPercent = (
  dailyDemand: number[],
  targetBalance: number,
  daysCovered: number
) => {
  const periodDemand = dailyDemand.map((_, index) =>
    dailyDemand
      .slice(index, Math.min(dailyDemand.length, index + Math.max(1, Math.ceil(daysCovered))))
      .reduce((total, demand) => total + demand, 0) * Math.min(daysCovered, 1)
  )
  const missedPeriods = periodDemand.filter((demand) => demand > targetBalance).length

  return periodDemand.length === 0 ? 0 : missedPeriods / periodDemand.length
}

export const roundUp = (value: number, increment: number) => {
  const safeIncrement = increment > 0 ? increment : 1
  return Math.ceil(value / safeIncrement) * safeIncrement
}

export const percentile = (values: number[], percentileValue: number) => {
  const sorted = values.filter(Number.isFinite).sort((first, second) => first - second)

  if (sorted.length === 0) {
    return 0
  }

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)
  )
  return sorted[index]
}

const listDateKeys = (from: Date, to: Date) => {
  const days: string[] = []
  const current = new Date(`${from.toISOString().slice(0, 10)}T00:00:00.000Z`)
  const end = new Date(`${to.toISOString().slice(0, 10)}T00:00:00.000Z`)

  while (current <= end) {
    days.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return days
}

const listPreviousDateKeys = (from: Date, dayCount: number) => {
  const end = new Date(`${from.toISOString().slice(0, 10)}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - Math.max(dayCount - 1, 0))

  return listDateKeys(start, end)
}

const calculatePercentChange = (previousValue: number, currentValue: number) => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 1
  }

  return (currentValue - previousValue) / previousValue
}

const getConfidence = (sampleSize: number, dayCount: number) => {
  if (sampleSize < 20 || dayCount < 14) {
    return "low"
  }

  if (sampleSize < 100 || dayCount < 45) {
    return "medium"
  }

  return "high"
}

const getCapNote = (input: {
  capGap: number
  exceedsCap: boolean
  frequency: string
  weekendCarryRequired: boolean
}) => {
  if (!input.exceedsCap) {
    return undefined
  }

  if (input.weekendCarryRequired) {
    return `La cobertura de fin de semana supera el límite preferido por ${input.capGap.toFixed(2)} MXN; aumenta el límite para cubrir el fin de semana.`
  }

  return `${input.frequency} supera el límite preferido por ${input.capGap.toFixed(2)} MXN; considera más recargas durante el día.`
}

const shouldApplyWeekendBuffer = (operatingDate: Date) => {
  const day = operatingDate.getUTCDay()
  return day === 5 || day === 6 || day === 0
}
