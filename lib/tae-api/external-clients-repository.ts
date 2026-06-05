import "server-only"

import { createTaeApiClient } from "./client"
import type { TaeApiClient } from "./types"

export interface ExternalClientCatalogEntry {
  externalClientId: number
  displayName: string
  transactionCount: number
  lastTransactionAt: string | null
}

export interface ListExternalClientsInput {
  client?: TaeApiClient
  search: string | null
  page: number
  pageSize: number
}

export const listExternalClients = async (
  input: ListExternalClientsInput
): Promise<ExternalClientCatalogEntry[]> => {
  const client = input.client ?? createTaeApiClient()
  const accounts = await client.getAccountsList({ cuentaID: 0 })
  const search = input.search?.trim().toLowerCase()
  const filteredAccounts = search
    ? accounts.filter((account) => {
        const externalClientId = String(account.cuentaID)
        const displayName = account.displayName?.toLowerCase() ?? ""
        return externalClientId.includes(search) || displayName.includes(search)
      })
    : accounts
  const start = Math.max(input.page - 1, 0) * input.pageSize

  return filteredAccounts
    .slice(start, start + input.pageSize)
    .map((account) => ({
      externalClientId: Number(account.cuentaID),
      displayName: account.displayName?.trim() || `Cliente ${account.cuentaID}`,
      transactionCount: 0,
      lastTransactionAt: null,
    }))
}
