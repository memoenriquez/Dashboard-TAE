export type TransactionStatus = "successful" | "failed"
export type TransactionStatusFilter = TransactionStatus | "all"

export interface NormalizedTransactionRecord {
  ticket: string
  externalClientId: number
  visibleClientName: string
  occurredAt: string
  status: TransactionStatus
  phoneNumber: string
  operatorName: "Telcel"
  sku: string
  productName: string | null
  soldAmount: number
  responseCode: string
  responseMessage: string | null
  apiReference: string | null
}

export interface ExternalTransactionRow {
  ticket: string | number
  cuentaid: string | number
  fechahora: string | Date
  telefono: string | number
  SKU: string | number
  productName: string | null
  monto: string | number
  codresp: string | number
  descrip: string | null
  mensajenativo: string | null
  tokentransid: string | null
  trequestid: string | null
  nombrenegocio: string | null
  razonsocial: string | null
}

export interface TransactionFilters {
  from: Date
  to: Date
  status: TransactionStatusFilter
  phoneNumber: string | null
  operatorName: "Telcel"
  reference: string | null
  externalClientId?: number | null
}
