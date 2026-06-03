import "server-only"

import { queryExternalDbRows } from "./client"
import {
  mapExternalClientCatalogRow,
  type ExternalClientCatalogEntry,
  type ExternalClientCatalogRow,
} from "./external-clients"
import { buildExternalClientsQuery } from "./transaction-queries"

export interface ListExternalClientsInput {
  search: string | null
  page: number
  pageSize: number
}

export const listExternalClients = async (
  input: ListExternalClientsInput
): Promise<ExternalClientCatalogEntry[]> => {
  const rows = await queryExternalDbRows<ExternalClientCatalogRow>(
    buildExternalClientsQuery(input)
  )

  return rows.map(mapExternalClientCatalogRow)
}
