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
