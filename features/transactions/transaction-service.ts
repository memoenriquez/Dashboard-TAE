import type { TransactionScope } from "@/features/clients/scope"

import type { NormalizedTransactionRecord, TransactionFilters } from "./types"

export interface TransactionKpis {
  transactionCount: number
  soldAmount: number
}

export interface TransactionMetricKpis extends TransactionKpis {
  successfulTransactionCount: number
  failedTransactionCount: number
  successRate: number
  averageTicket: number
}

export interface TransactionClientMetric {
  externalClientId: number
  visibleClientName: string
  transactionCount: number
  successfulTransactionCount: number
  failedTransactionCount: number
  soldAmount: number
  successRate: number
  averageTicket: number
}

export interface TransactionSalesTrendPoint {
  successfulTransactionCount: number
  soldAmount: number
  averageSale: number
}

export interface TransactionDailySalesTrendPoint extends TransactionSalesTrendPoint {
  date: string
}

export interface TransactionHourlySalesTrendPoint extends TransactionSalesTrendPoint {
  hour: number
}

export interface TransactionSalesConcentration {
  topClientShare: number
  topThreeClientsShare: number
}

export interface TransactionMetricsResult {
  kpis: TransactionMetricKpis
  topClient: TransactionClientMetric | null
  clientRanking: TransactionClientMetric[]
  dailySales: TransactionDailySalesTrendPoint[]
  hourlySales: TransactionHourlySalesTrendPoint[]
  peakSalesDate: TransactionDailySalesTrendPoint | null
  peakSalesHour: TransactionHourlySalesTrendPoint | null
  salesConcentration: TransactionSalesConcentration
}

export interface TransactionRepository {
  listTransactions: (input: TransactionRepositoryListInput) => Promise<NormalizedTransactionRecord[]>
  getTransactionKpis: (input: TransactionRepositoryScopedInput) => Promise<TransactionKpis>
  getTransactionDetail: (
    input: TransactionRepositoryDetailInput
  ) => Promise<NormalizedTransactionRecord | null>
}

export interface TransactionRepositoryScopedInput {
  filters: TransactionFilters
  scope: TransactionScope
}

export interface TransactionRepositoryListInput extends TransactionRepositoryScopedInput {
  page: number
  pageSize: number
}

export interface TransactionRepositoryDetailInput {
  ticket: string
  scope: TransactionScope
}

export interface ListTransactionsInput extends TransactionRepositoryListInput {
  repository: TransactionRepository
}

export interface ListTransactionsResult {
  rows: NormalizedTransactionRecord[]
  kpis: TransactionKpis
  pagination: {
    page: number
    pageSize: number
    totalRows: number
  }
}

export const listTransactions = async (
  input: ListTransactionsInput
): Promise<ListTransactionsResult> => {
  const [rows, kpis] = await Promise.all([
    input.repository.listTransactions(input),
    input.repository.getTransactionKpis(input),
  ])

  return {
    rows,
    kpis,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalRows: kpis.transactionCount,
    },
  }
}

export const getTransactionDetail = async (input: {
  repository: TransactionRepository
  scope: TransactionScope
  ticket: string
}) =>
  input.repository.getTransactionDetail({
    scope: input.scope,
    ticket: input.ticket,
  })

export const getTransactionMetrics = async (input: {
  repository: TransactionRepository
  scope: TransactionScope
  filters: TransactionFilters
}): Promise<TransactionMetricsResult> => {
  const rows = await input.repository.listTransactions({
    scope: input.scope,
    filters: input.filters,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  })
  const kpis = calculateMetricKpis(rows)
  const clientRanking = calculateClientRanking(rows)
  const dailySales = calculateDailySales(rows)
  const hourlySales = calculateHourlySales(rows)

  return {
    kpis,
    topClient: kpis.soldAmount > 0 ? clientRanking[0] ?? null : null,
    clientRanking,
    dailySales,
    hourlySales,
    peakSalesDate: findPeakSalesPoint(dailySales),
    peakSalesHour: findPeakSalesPoint(hourlySales),
    salesConcentration: calculateSalesConcentration(clientRanking, kpis.soldAmount),
  }
}

export const createTransactionsCsv = async (input: {
  repository: TransactionRepository
  scope: TransactionScope
  filters: TransactionFilters
}) => {
  const rows = await input.repository.listTransactions({
    filters: input.filters,
    scope: input.scope,
    page: 1,
    pageSize: 10_000,
  })

  return [
    [
      "ticket",
      "fecha",
      "estado",
      "operador",
      "producto",
      "telefono",
      "monto_vendido",
      "cliente_visible",
      "codigo_respuesta",
      "mensaje_respuesta",
      "referencia_api",
    ].join(","),
    ...rows.map(formatCsvRow),
  ].join("\n")
}

const formatCsvRow = (row: NormalizedTransactionRecord) =>
  [
    row.ticket,
    row.occurredAt,
    row.status,
    row.operatorName,
    row.productName ?? "",
    row.phoneNumber,
    row.status === "successful" ? row.soldAmount.toFixed(2) : "0.00",
    row.visibleClientName,
    row.responseCode,
    row.responseMessage ?? "",
    row.apiReference ?? "",
  ]
    .map(escapeCsvValue)
    .join(",")

const calculateMetricKpis = (rows: NormalizedTransactionRecord[]): TransactionMetricKpis => {
  const transactionCount = rows.length
  const successfulRows = rows.filter((row) => row.status === "successful")
  const successfulTransactionCount = successfulRows.length
  const failedTransactionCount = transactionCount - successfulTransactionCount
  const soldAmount = successfulRows.reduce((total, row) => total + row.soldAmount, 0)

  return {
    transactionCount,
    successfulTransactionCount,
    failedTransactionCount,
    soldAmount,
    successRate: transactionCount === 0 ? 0 : successfulTransactionCount / transactionCount,
    averageTicket:
      successfulTransactionCount === 0 ? 0 : soldAmount / successfulTransactionCount,
  }
}

const calculateClientRanking = (
  rows: NormalizedTransactionRecord[]
): TransactionClientMetric[] => {
  const clients = new Map<number, NormalizedTransactionRecord[]>()

  rows.forEach((row) => {
    clients.set(row.externalClientId, [
      ...(clients.get(row.externalClientId) ?? []),
      row,
    ])
  })

  return Array.from(clients.entries())
    .map(([externalClientId, clientRows]) => {
      const kpis = calculateMetricKpis(clientRows)

      return {
        externalClientId,
        visibleClientName: clientRows[0]?.visibleClientName ?? `CuentaID ${externalClientId}`,
        transactionCount: kpis.transactionCount,
        successfulTransactionCount: kpis.successfulTransactionCount,
        failedTransactionCount: kpis.failedTransactionCount,
        soldAmount: kpis.soldAmount,
        successRate: kpis.successRate,
        averageTicket: kpis.averageTicket,
      }
    })
    .sort((first, second) => {
      if (first.soldAmount !== second.soldAmount) {
        return second.soldAmount - first.soldAmount
      }

      if (first.transactionCount !== second.transactionCount) {
        return second.transactionCount - first.transactionCount
      }

      return first.visibleClientName.localeCompare(second.visibleClientName, "es-MX")
    })
}

const calculateDailySales = (
  rows: NormalizedTransactionRecord[]
): TransactionDailySalesTrendPoint[] =>
  Array.from(groupSuccessfulRows(rows, (row) => row.occurredAt.slice(0, 10)).entries())
    .map(([date, successfulRows]) => ({
      date,
      ...calculateSalesTrendPoint(successfulRows),
    }))
    .sort((first, second) => first.date.localeCompare(second.date))

const calculateHourlySales = (
  rows: NormalizedTransactionRecord[]
): TransactionHourlySalesTrendPoint[] =>
  Array.from(
    groupSuccessfulRows(rows, (row) => String(getPublishedHour(row.occurredAt))).entries()
  )
    .map(([hour, successfulRows]) => ({
      hour: Number(hour),
      ...calculateSalesTrendPoint(successfulRows),
    }))
    .sort((first, second) => first.hour - second.hour)

const getPublishedHour = (occurredAt: string) => {
  const hour = Number(occurredAt.match(/T(\d{2})/)?.[1])

  if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
    return hour
  }

  return new Date(occurredAt).getHours()
}

const groupSuccessfulRows = (
  rows: NormalizedTransactionRecord[],
  getKey: (row: NormalizedTransactionRecord) => string
) => {
  const groupedRows = new Map<string, NormalizedTransactionRecord[]>()

  rows.forEach((row) => {
    if (row.status !== "successful") {
      return
    }

    const key = getKey(row)
    groupedRows.set(key, [...(groupedRows.get(key) ?? []), row])
  })

  return groupedRows
}

const calculateSalesTrendPoint = (
  successfulRows: NormalizedTransactionRecord[]
): TransactionSalesTrendPoint => {
  const soldAmount = successfulRows.reduce((total, row) => total + row.soldAmount, 0)
  const successfulTransactionCount = successfulRows.length

  return {
    successfulTransactionCount,
    soldAmount,
    averageSale:
      successfulTransactionCount === 0 ? 0 : soldAmount / successfulTransactionCount,
  }
}

const calculateSalesConcentration = (
  clientRanking: TransactionClientMetric[],
  soldAmount: number
): TransactionSalesConcentration => {
  if (soldAmount === 0) {
    return {
      topClientShare: 0,
      topThreeClientsShare: 0,
    }
  }

  return {
    topClientShare: (clientRanking[0]?.soldAmount ?? 0) / soldAmount,
    topThreeClientsShare:
      clientRanking
        .slice(0, 3)
        .reduce((total, client) => total + client.soldAmount, 0) / soldAmount,
  }
}

const findPeakSalesPoint = <TPoint extends TransactionSalesTrendPoint>(
  points: TPoint[]
): TPoint | null => {
  if (points.length === 0) {
    return null
  }

  return points.reduce((peakPoint, point) =>
    point.soldAmount > peakPoint.soldAmount ? point : peakPoint
  )
}

const escapeCsvValue = (value: string | number) => {
  const stringValue = neutralizeSpreadsheetFormula(String(value))

  if (!/[",\n\r]/.test(stringValue)) {
    return stringValue
  }

  return `"${stringValue.replaceAll("\"", "\"\"")}"`
}

const neutralizeSpreadsheetFormula = (value: string) => {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }

  return value
}
