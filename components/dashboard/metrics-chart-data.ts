import type {
  DashboardClientMetric,
  DashboardDailySalesTrendPoint,
  DashboardHourlySalesTrendPoint,
} from "./types"

export interface SalesChartDatum {
  label: string
  soldAmount: number
  averageSale: number
  successfulTransactionCount: number
}

export interface ClientRankingChartDatum {
  label: string
  soldAmount: number
  transactionCount: number
}

export const toDailySalesChartData = (
  rows: DashboardDailySalesTrendPoint[]
): SalesChartDatum[] =>
  rows.map((row) => ({
    label: formatDateLabel(row.date),
    soldAmount: row.soldAmount,
    averageSale: row.averageSale,
    successfulTransactionCount: row.successfulTransactionCount,
  }))

export const toHourlySalesChartData = (
  rows: DashboardHourlySalesTrendPoint[]
): SalesChartDatum[] =>
  rows.map((row) => ({
    label: `${String(row.hour).padStart(2, "0")} hrs`,
    soldAmount: row.soldAmount,
    averageSale: row.averageSale,
    successfulTransactionCount: row.successfulTransactionCount,
  }))

export const toClientRankingChartData = (
  rows: DashboardClientMetric[]
): ClientRankingChartDatum[] =>
  rows.slice(0, 5).map((row) => ({
    label: row.visibleClientName,
    soldAmount: row.soldAmount,
    transactionCount: row.transactionCount,
  }))

const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).replace("-", " ")
