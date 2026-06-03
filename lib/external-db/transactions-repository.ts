import "server-only"

import type { TransactionScope } from "@/features/clients/scope"
import { normalizeTransactionRow } from "@/features/transactions/normalize"
import type {
  ExternalTransactionRow,
  NormalizedTransactionRecord,
} from "@/features/transactions/types"
import type {
  TransactionKpis,
  TransactionRepository,
  TransactionRepositoryDetailInput,
  TransactionRepositoryListInput,
  TransactionRepositoryScopedInput,
} from "@/features/transactions/transaction-service"

import { queryExternalDbRows } from "./client"
import {
  buildTransactionDetailQuery,
  buildTransactionKpisQuery,
  buildTransactionsQuery,
} from "./transaction-queries"

interface ExternalKpiRow {
  transactionCount: number | string | bigint
  soldAmount: number | string | null
}

export const createSqlServerTransactionRepository = (): TransactionRepository => ({
  listTransactions: async (input) => listTransactions(input),
  getTransactionKpis: async (input) => getTransactionKpis(input),
  getTransactionDetail: async (input) => getTransactionDetail(input),
})

const listTransactions = async (
  input: TransactionRepositoryListInput
): Promise<NormalizedTransactionRecord[]> => {
  const externalClientIds = getScopedExternalClientIds(input.scope)

  if (isEmptyScopedResult(input.scope, externalClientIds)) {
    return []
  }

  const rows = await queryExternalDbRows<ExternalTransactionRow>(
    buildTransactionsQuery({
      filters: input.filters,
      externalClientIds,
      page: input.page,
      pageSize: input.pageSize,
    })
  )

  return rows.map(normalizeTransactionRow)
}

const getTransactionKpis = async (
  input: TransactionRepositoryScopedInput
): Promise<TransactionKpis> => {
  const externalClientIds = getScopedExternalClientIds(input.scope)

  if (isEmptyScopedResult(input.scope, externalClientIds)) {
    return {
      transactionCount: 0,
      soldAmount: 0,
    }
  }

  const [row] = await queryExternalDbRows<ExternalKpiRow>(
    buildTransactionKpisQuery({
      filters: input.filters,
      externalClientIds,
    })
  )

  return {
    transactionCount: Number(row?.transactionCount ?? 0),
    soldAmount: Number(row?.soldAmount ?? 0),
  }
}

const getTransactionDetail = async (
  input: TransactionRepositoryDetailInput
): Promise<NormalizedTransactionRecord | null> => {
  const externalClientIds = getScopedExternalClientIds(input.scope)

  if (isEmptyScopedResult(input.scope, externalClientIds)) {
    return null
  }

  const [row] = await queryExternalDbRows<ExternalTransactionRow>(
    buildTransactionDetailQuery({
      ticket: input.ticket,
      externalClientIds,
    })
  )

  if (!row) {
    return null
  }

  return normalizeTransactionRow(row)
}

const getScopedExternalClientIds = (scope: TransactionScope) => {
  if (scope.type === "global") {
    return []
  }

  return scope.externalClientIds
}

const isEmptyScopedResult = (scope: TransactionScope, externalClientIds: number[]) =>
  scope.type === "external_client_ids" && externalClientIds.length === 0
