import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { DashboardUnauthorizedError } from "../../../_lib/errors"
import { withApiErrorHandling } from "../../../_lib/api-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const BUCKET = "reconciliation-files"

const handleCron = withApiErrorHandling(async (request: Request) => {
  assertCronSecret(request)

  const adminClient = createAdminClient()
  const repository = createReconciliationRepository(adminClient)
  const cutoffDate = getCutoffDate(getRetentionDays())
  const runs = await repository.listRunsWithFilesBeforeDate(cutoffDate)
  const results = []

  for (const run of runs) {
    if (!run.storagePath) {
      continue
    }

    const { error } = await adminClient.storage.from(BUCKET).remove([run.storagePath])
    if (error) {
      results.push({ runId: run.id, status: "failed", error: error.message })
      continue
    }

    await repository.markRunFileDeleted({
      id: run.id,
      fileDeletedAt: new Date().toISOString(),
    })
    results.push({ runId: run.id, status: "deleted" })
  }

  return Response.json({ cutoffDate, results })
})

export const GET = handleCron
export const POST = handleCron

const assertCronSecret = (request: Request) => {
  const expected = process.env.CRON_SECRET
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (!expected || actual !== expected) {
    throw new DashboardUnauthorizedError()
  }
}

const getRetentionDays = () => {
  const value = Number(process.env.RECONCILIATION_RETENTION_DAYS ?? 90)
  return Number.isInteger(value) && value > 0 ? value : 90
}

const getCutoffDate = (retentionDays: number) =>
  new Date(Date.now() - retentionDays * 86_400_000).toISOString().slice(0, 10)
