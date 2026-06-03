import { listTransactions } from "@/features/transactions/transaction-service"
import { applyExternalClientFilterToScope } from "@/features/clients/scope"
import { createSqlServerTransactionRepository } from "@/lib/external-db/transactions-repository"

import { resolveDashboardRequestContext } from "../_lib/dashboard-context"
import { toApiErrorResponse } from "../_lib/errors"
import {
  parsePositiveInteger,
  parseTransactionSearchParams,
} from "../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const context = await resolveDashboardRequestContext()
    const filters = parseTransactionSearchParams(url.searchParams)
    const scope = applyExternalClientFilterToScope(
      context.scope,
      filters.externalClientId ?? null
    )
    const page = parsePositiveInteger(url.searchParams, "page", 1, 10_000)
    const pageSize = parsePositiveInteger(url.searchParams, "pageSize", 25, 100)
    const result = await listTransactions({
      repository: createSqlServerTransactionRepository(),
      scope,
      filters,
      page,
      pageSize,
    })

    return Response.json(result)
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
