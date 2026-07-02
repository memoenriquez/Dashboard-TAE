import { captureOpeningBalances } from "@/features/opening-balances/snapshot-service"
import { createTaeApiBalanceRepository } from "@/lib/tae-api/balance-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDashboardMetadataRepository } from "@/lib/supabase/metadata-repository"
import { createOpeningBalanceSnapshotRepository } from "@/lib/supabase/opening-balance-repository"

import { DashboardUnauthorizedError } from "../../_lib/errors"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const handleCron = withApiErrorHandling(async (request: Request) => {
  assertCronSecret(request)

  const adminClient = createAdminClient()
  const metadataRepository = createDashboardMetadataRepository(adminClient)
  const clients = await metadataRepository.listClients()
  const result = await captureOpeningBalances({
    clients,
    balanceRepository: createTaeApiBalanceRepository(),
    snapshotRepository: createOpeningBalanceSnapshotRepository(adminClient),
    timeZone: process.env.OPENING_BALANCE_TIMEZONE ?? "America/Mexico_City",
  })

  return Response.json(result)
})

export const GET = handleCron

const assertCronSecret = (request: Request) => {
  const expected = process.env.CRON_SECRET
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (!expected || actual !== expected) {
    throw new DashboardUnauthorizedError()
  }
}
