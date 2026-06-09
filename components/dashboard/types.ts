export interface DashboardTransaction {
  ticket: string
  externalClientId: number
  visibleClientName: string
  occurredAt: string
  status: "successful" | "failed"
  phoneNumber: string
  operatorName: "Telcel"
  sku: string
  productName: string | null
  soldAmount: number
  responseCode: string
  responseMessage: string | null
  apiReference: string | null
}

export interface DashboardClientContext {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: "admin" | "parent" | "child" | "standalone"
}

export interface DashboardClientOption {
  id: string
  externalClientId: number
  displayName: string
  clientKind: "parent" | "child" | "standalone"
}

export interface AccountBalanceResponse {
  externalClientId: number
  balance: number
  updatedAt: string
}

export interface TransactionsResponse {
  rows: DashboardTransaction[]
  kpis: {
    transactionCount: number
    soldAmount: number
  }
  pagination: {
    page: number
    pageSize: number
    totalRows: number
  }
}

export interface DashboardMetricKpis {
  transactionCount: number
  successfulTransactionCount: number
  failedTransactionCount: number
  soldAmount: number
  successRate: number
  averageTicket: number
}

export interface DashboardClientMetric {
  externalClientId: number
  visibleClientName: string
  transactionCount: number
  successfulTransactionCount: number
  failedTransactionCount: number
  soldAmount: number
  successRate: number
  averageTicket: number
}

export interface DashboardSalesTrendPoint {
  successfulTransactionCount: number
  soldAmount: number
  averageSale: number
}

export interface DashboardDailySalesTrendPoint extends DashboardSalesTrendPoint {
  date: string
}

export interface DashboardHourlySalesTrendPoint extends DashboardSalesTrendPoint {
  hour: number
}

export interface DashboardSalesConcentration {
  topClientShare: number
  topThreeClientsShare: number
}

export interface MetricsResponse {
  kpis: DashboardMetricKpis
  topClient: DashboardClientMetric | null
  clientRanking: DashboardClientMetric[]
  dailySales: DashboardDailySalesTrendPoint[]
  hourlySales: DashboardHourlySalesTrendPoint[]
  peakSalesDate: DashboardDailySalesTrendPoint | null
  peakSalesHour: DashboardHourlySalesTrendPoint | null
  salesConcentration: DashboardSalesConcentration
}
