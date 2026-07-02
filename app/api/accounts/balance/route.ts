import { getAccountBalance } from "@/features/accounts/balance-service"
import { applyExternalClientFilterToScope } from "@/features/clients/scope"
import { getBusinessDate } from "@/features/opening-balances/date"
import { getOpeningBalanceSnapshot } from "@/features/opening-balances/snapshot-service"
import { createTaeApiBalanceRepository } from "@/lib/tae-api/balance-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createOpeningBalanceSnapshotRepository } from "@/lib/supabase/opening-balance-repository"

import { withApiErrorHandling } from "../../_lib/api-route"
import { DashboardValidationError } from "../../_lib/errors"
import { resolveTransactionRequestContext } from "../../_lib/dashboard-context"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async (request: Request) => {
  const url = new URL(request.url)
  const externalClientId = parseExternalClientId(url.searchParams)
  const context = await resolveTransactionRequestContext()
  const scope = applyExternalClientFilterToScope(context.scope, externalClientId)
  const [balance, openingBalance] = await Promise.all([
    getAccountBalance({
      repository: createTaeApiBalanceRepository(),
      scope,
    }),
    getOptionalOpeningBalanceSnapshot(externalClientId),
  ])

  return Response.json({ ...balance, openingBalance })
})

const getOptionalOpeningBalanceSnapshot = async (externalClientId: number) => {
  try {
    return await getOpeningBalanceSnapshot({
      repository: createOpeningBalanceSnapshotRepository(createAdminClient()),
      externalClientId,
      businessDate: getBusinessDate({
        timeZone: process.env.OPENING_BALANCE_TIMEZONE ?? "America/Mexico_City",
      }),
    })
  } catch {
    return null
  }
}

const parseExternalClientId = (searchParams: URLSearchParams) => {
  const externalClientId = searchParams.get("externalClientId")

  if (!externalClientId || externalClientId === "all") {
    throw new DashboardValidationError("Selecciona una cuenta para consultar saldo.")
  }

  const value = Number(externalClientId)

  if (!Number.isInteger(value) || value < 1) {
    throw new DashboardValidationError("Invalid external client id")
  }

  return value
}
