import { generateReconciliationRun } from "@/features/reconciliation/generation-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDashboardMetadataRepository } from "@/lib/supabase/metadata-repository"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { DashboardUnauthorizedError, DashboardValidationError } from "../../_lib/errors"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withApiErrorHandling(async (request: Request) => {
    assertCronSecret(request)

    const url = new URL(request.url)
    const requestedClientId = url.searchParams.get("clientId")
    const adminClient = createAdminClient()
    const metadataRepository = createDashboardMetadataRepository(adminClient)
    const reconciliationRepository = createReconciliationRepository(adminClient)
    const configs = (await reconciliationRepository.listConfigs())
      .filter((config) => config.isEnabled)
      .filter((config) => !requestedClientId || config.ownerClientId === requestedClientId)

    if (requestedClientId && configs.length === 0) {
      throw new DashboardValidationError("No enabled reconciliation config found")
    }

    const reconciledDate = getYesterdayDate(
      process.env.RECONCILIATION_CRON_TIMEZONE ?? "America/Mexico_City"
    )
    const results = []

    for (const config of configs) {
      try {
        const ownerClient = await metadataRepository.getClientById(config.ownerClientId)
        if (!ownerClient || ownerClient.clientKind === "child") {
          results.push({ ownerClientId: config.ownerClientId, status: "skipped" })
          continue
        }

        const run = await generateReconciliationRun({
          ownerClient,
          reconciledDate,
          metadataRepository,
          reconciliationRepository,
          supabase: adminClient,
        })
        results.push({ ownerClientId: config.ownerClientId, runId: run.id, status: run.status })
      } catch (error) {
        results.push({
          ownerClientId: config.ownerClientId,
          error: error instanceof Error ? error.message : "Unexpected error",
          status: "failed",
        })
      }
    }

    return Response.json({ reconciledDate, results })
})

const assertCronSecret = (request: Request) => {
  const expected = process.env.CRON_SECRET
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (!expected || actual !== expected) {
    throw new DashboardUnauthorizedError()
  }
}

const getYesterdayDate = (timeZone: string) => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now)
  const byType = new Map(parts.map((part) => [part.type, part.value]))
  const todayUtc = Date.UTC(
    Number(byType.get("year")),
    Number(byType.get("month")) - 1,
    Number(byType.get("day"))
  )

  return new Date(todayUtc - 86_400_000).toISOString().slice(0, 10)
}
