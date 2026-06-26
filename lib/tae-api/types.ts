import type { ExternalTransactionRow } from "@/features/transactions/types"

export interface TaeApiEnvelope<TData> {
  success: boolean
  message: string | null
  data: TData
}

export interface TaeAccount {
  cuentaID: number
  displayName: string | null
}

export interface TaeTransaction {
  ticket: string
  cuentaID: number
  fechaHora: string
  telefono: string | number
  sku: string | number
  producto: string | null
  monto: string | number
  codigoRespuesta: string | number
  descripcion: string | null
  tokenTransaction: string | null
  razonSocial: string | null
  nombreNegocio: string | null
  autorizacion: string | null
}

export interface TaeBalance {
  cuentaID: number
  balance: number
  ultimaAct: string
}

export interface TaeGetAccountsListInput {
  cuentaID: number
}

export interface TaeGetTransactionsListInput {
  fechaIni: string
  fechaFin: string
  cuentaID: number
  offSet: number
  pageSize: number
}

export interface TaeGetBalanceAccountInput {
  cuentaID: number
}

export interface TaeApiClient {
  getAccountsList: (input: TaeGetAccountsListInput) => Promise<TaeAccount[]>
  getTransactionsList: (
    input: TaeGetTransactionsListInput
  ) => Promise<TaeTransaction[]>
  getBalanceAccount: (input: TaeGetBalanceAccountInput) => Promise<TaeBalance>
}

export const mapTaeTransactionToExternalRow = (
  transaction: TaeTransaction
): ExternalTransactionRow => ({
  ticket: transaction.ticket,
  cuentaid: transaction.cuentaID,
  fechahora: transaction.fechaHora,
  telefono: transaction.telefono,
  SKU: transaction.sku,
  productName: transaction.producto,
  monto: transaction.monto,
  codresp: transaction.codigoRespuesta,
  descrip: transaction.descripcion,
  mensajenativo: null,
  tokentransid: transaction.tokenTransaction,
  trequestid: null,
  nombrenegocio: transaction.nombreNegocio,
  razonsocial: transaction.razonSocial,
  autorizacion: transaction.autorizacion,
})
