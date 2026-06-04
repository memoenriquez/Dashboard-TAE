import type { TransactionScope } from "@/features/clients/scope"

import type { NormalizedTransactionRecord, TransactionFilters } from "./types"

export interface TransactionKpis {
  transactionCount: number
  soldAmount: number
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
