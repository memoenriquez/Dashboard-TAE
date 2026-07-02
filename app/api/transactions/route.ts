import { listTransactions } from "@/features/transactions/transaction-service"
import { applyExternalClientFilterToScope } from "@/features/clients/scope"
import { getBusinessDate, getBusinessDateRange } from "@/features/opening-balances/date"
import { createTaeApiTransactionRepository } from "@/lib/tae-api/transactions-repository"

import { resolveTransactionRequestContext } from "../_lib/dashboard-context"
import { withApiErrorHandling } from "../_lib/api-route"
import {
  parsePositiveInteger,
  parseTransactionSearchParams,
} from "../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async (request: Request) => {
    const url = new URL(request.url)
    const context = await resolveTransactionRequestContext()
    const filters = parseTransactionSearchParams(url.searchParams)
    const scope = applyExternalClientFilterToScope(
      context.scope,
      filters.externalClientId ?? null
    )
    const page = parsePositiveInteger(url.searchParams, "page", 1, 10_000)
    const pageSize = parsePositiveInteger(url.searchParams, "pageSize", 25, 100)
    const repository = createTaeApiTransactionRepository()
    const result = await listTransactions({
      repository,
      scope,
      filters,
      page,
      pageSize,
    })
    const todayRange = getBusinessDateRange(
      getBusinessDate({
        timeZone: process.env.OPENING_BALANCE_TIMEZONE ?? "America/Mexico_City",
      })
    )
    const today = await listTransactions({
      repository,
      scope,
      filters: {
        ...todayRange,
        status: "all",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
      page: 1,
      pageSize: 1,
    })

    return Response.json({
      ...result,
      kpis: {
        ...result.kpis,
        todaySoldAmount: today.kpis.soldAmount,
      },
    })
})
