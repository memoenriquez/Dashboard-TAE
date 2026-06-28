import { recordAuditEvent } from "@/features/audit/audit-service"
import { generateReconciliationRun } from "@/features/reconciliation/generation-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()
    const body = await readJsonObject(request)
    const ownerClientId = typeof body.ownerClientId === "string" ? body.ownerClientId.trim() : ""
    const reconciledDate = typeof body.reconciledDate === "string" ? body.reconciledDate.trim() : ""

    if (!ownerClientId || !/^\d{4}-\d{2}-\d{2}$/.test(reconciledDate)) {
      throw new DashboardValidationError("Missing reconciliation generation fields")
    }

    assertAllowedReconciledDate(reconciledDate)

    const ownerClient = await context.metadataRepository.getClientById(ownerClientId)
    if (!ownerClient || ownerClient.clientKind === "child") {
      throw new DashboardValidationError("Reconciliation owner must be parent or standalone")
    }

    const adminClient = createAdminClient()
    const run = await generateReconciliationRun({
      ownerClient,
      reconciledDate,
      metadataRepository: context.metadataRepository,
      reconciliationRepository: createReconciliationRepository(adminClient),
      supabase: adminClient,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "reconciliation_file_generated",
        targetType: "reconciliation_run",
        targetId: run.id,
        metadata: {
          ownerClientId: run.ownerClientId,
          reconciledDate: run.reconciledDate,
          status: run.status,
        },
      },
    })

    return Response.json({ run })
})

const assertAllowedReconciledDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const minUtc = todayUtc - 90 * 86_400_000
  const valueUtc = date.getTime()

  if (Number.isNaN(valueUtc) || valueUtc >= todayUtc || valueUtc < minUtc) {
    throw new DashboardValidationError("Reconciled date must be a fully passed date within the last 90 days")
  }
}
