import "server-only"

import type { TransactionScope } from "@/features/clients/scope"
import { normalizeTransactionRow } from "@/features/transactions/normalize"
import type {
  NormalizedTransactionRecord,
  TransactionFilters,
} from "@/features/transactions/types"
import type {
  TransactionKpis,
  TransactionRepository,
  TransactionRepositoryScopedInput,
} from "@/features/transactions/transaction-service"

import { createTaeApiClient } from "./client"
import {
  mapTaeTransactionToExternalRow,
  type TaeApiClient,
  type TaeTransaction,
} from "./types"

interface CreateTaeApiTransactionRepositoryInput {
  client?: TaeApiClient
  concurrency?: number
  pageSizePerAccount?: number
  maxPagesPerAccount?: number
  maxAccounts?: number
  maxRows?: number
}

interface MergedTransactionResult {
  rows: NormalizedTransactionRecord[]
  kpis: TransactionKpis
}

export const createTaeApiTransactionRepository = (
  input: CreateTaeApiTransactionRepositoryInput = {}
): TransactionRepository => {
  const client = input.client ?? createTaeApiClient()
  const cache = new Map<string, Promise<MergedTransactionResult>>()
  const options = {
    concurrency: input.concurrency ?? getPositiveIntegerEnv("TAE_FANOUT_CONCURRENCY", 5),
    pageSizePerAccount:
      input.pageSizePerAccount ?? getPositiveIntegerEnv("TAE_ACCOUNT_PAGE_SIZE", 100),
    maxPagesPerAccount:
      input.maxPagesPerAccount ?? getPositiveIntegerEnv("TAE_MAX_PAGES_PER_ACCOUNT", 100),
    maxAccounts: input.maxAccounts ?? getPositiveIntegerEnv("TAE_FANOUT_MAX_ACCOUNTS", 50),
    maxRows: input.maxRows ?? getPositiveIntegerEnv("TAE_FANOUT_MAX_ROWS", 10_000),
  }

  const loadMergedTransactions = (input: TransactionRepositoryScopedInput) => {
    const cacheKey = getCacheKey(input)
    const cachedResult = cache.get(cacheKey)

    if (cachedResult) {
      return cachedResult
    }

    const result = loadTransactionsForScope({
      client,
      filters: input.filters,
      scope: input.scope,
      ...options,
    })
    cache.set(cacheKey, result)
    return result
  }

  return {
    listTransactions: async (input) => {
      const result = await loadMergedTransactions(input)
      const start = Math.max(input.page - 1, 0) * input.pageSize
      return result.rows.slice(start, start + input.pageSize)
    },
    getTransactionKpis: async (input) => {
      const result = await loadMergedTransactions(input)
      return result.kpis
    },
    getTransactionDetail: async () => null,
  }
}

const loadTransactionsForScope = async (input: {
  client: TaeApiClient
  filters: TransactionFilters
  scope: TransactionScope
  concurrency: number
  pageSizePerAccount: number
  maxPagesPerAccount: number
  maxAccounts: number
  maxRows: number
}): Promise<MergedTransactionResult> => {
  const accountIds = await resolveAccountIds(input.client, input.scope)

  if (accountIds.length === 0) {
    return {
      rows: [],
      kpis: {
        transactionCount: 0,
        soldAmount: 0,
      },
    }
  }

  if (accountIds.length > input.maxAccounts) {
    throw new Error("TAE transaction query exceeded the configured account limit")
  }

  const accountRows = await mapWithConcurrencyLimit(
    accountIds,
    input.concurrency,
    async (accountId) =>
      listAllAccountTransactions({
        client: input.client,
        accountId,
        filters: input.filters,
        pageSizePerAccount: input.pageSizePerAccount,
        maxPagesPerAccount: input.maxPagesPerAccount,
      })
  )
  const rows = accountRows
    .flat()
    .map(mapTaeTransactionToExternalRow)
    .map(normalizeTransactionRow)
    .filter((row) => matchesFilters(row, input.filters))
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))

  if (rows.length > input.maxRows) {
    throw new Error("TAE transaction query exceeded the configured row limit")
  }

  return {
    rows,
    kpis: {
      transactionCount: rows.length,
      soldAmount: rows.reduce(
        (total, row) => (row.status === "successful" ? total + row.soldAmount : total),
        0
      ),
    },
  }
}

const resolveAccountIds = async (client: TaeApiClient, scope: TransactionScope) => {
  if (scope.type === "external_client_ids") {
    return Array.from(new Set(scope.externalClientIds))
  }

  const accounts = await client.getAccountsList({ cuentaID: 0 })
  return Array.from(new Set(accounts.map((account) => Number(account.cuentaID))))
}

const listAllAccountTransactions = async (input: {
  client: TaeApiClient
  accountId: number
  filters: TransactionFilters
  pageSizePerAccount: number
  maxPagesPerAccount: number
}) => {
  const rows: TaeTransaction[] = []

  for (let pageIndex = 0; pageIndex < input.maxPagesPerAccount; pageIndex += 1) {
    const pageRows = await input.client.getTransactionsList({
      fechaIni: toTaeDate(input.filters.from),
      fechaFin: toTaeDate(input.filters.to),
      cuentaID: input.accountId,
      offSet: pageIndex * input.pageSizePerAccount,
      pageSize: input.pageSizePerAccount,
    })
    rows.push(...pageRows)

    if (pageRows.length < input.pageSizePerAccount) {
      return rows
    }
  }

  throw new Error("TAE transaction query exceeded the configured page limit")
}

const matchesFilters = (row: NormalizedTransactionRecord, filters: TransactionFilters) => {
  if (filters.status !== "all" && row.status !== filters.status) {
    return false
  }

  if (filters.phoneNumber && row.phoneNumber !== filters.phoneNumber) {
    return false
  }

  if (filters.reference) {
    return row.ticket === filters.reference || row.apiReference === filters.reference
  }

  return true
}

const mapWithConcurrencyLimit = async <TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem) => Promise<TResult>
) => {
  const results: TResult[] = []
  let nextIndex = 0

  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        results[currentIndex] = await mapper(items[currentIndex])
      }
    }
  )

  await Promise.all(workers)
  return results
}

const getCacheKey = (input: TransactionRepositoryScopedInput) =>
  JSON.stringify({
    scope: input.scope,
    filters: {
      ...input.filters,
      from: input.filters.from.toISOString(),
      to: input.filters.to.toISOString(),
    },
  })

const toTaeDate = (date: Date) => date.toISOString().slice(0, 10)

const getPositiveIntegerEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback)

  if (!Number.isInteger(value) || value < 1) {
    return fallback
  }

  return value
}
