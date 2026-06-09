import { DashboardAccessDeniedError } from "@/features/auth/errors"
import { applyExternalClientFilterToScope } from "@/features/clients/scope"
import { getTransactionMetrics } from "@/features/transactions/transaction-service"
import { createTaeApiTransactionRepository } from "@/lib/tae-api/transactions-repository"

import { withApiErrorHandling } from "../../_lib/api-route"
import { resolveTransactionRequestContext } from "../../_lib/dashboard-context"
import { parseTransactionSearchParams } from "../../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async (request: Request) => {
  const url = new URL(request.url)
  const context = await resolveTransactionRequestContext()

  if (!context.resolvedProfile.profile.isInternalAdmin) {
    throw new DashboardAccessDeniedError()
  }

  const filters = parseTransactionSearchParams(url.searchParams)
  const scope = applyExternalClientFilterToScope(
    context.scope,
    filters.externalClientId ?? null
  )
  const result = await getTransactionMetrics({
    repository: createTaeApiTransactionRepository(),
    scope,
    filters,
  })

  return Response.json(result)
})
