import { recordAuditEvent } from "@/features/audit/audit-service"
import { retryReconciliationSftpSend } from "@/features/reconciliation/generation-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { assertInternalAdminContext } from "../../../../_lib/dashboard-context"
import { DashboardValidationError } from "../../../../_lib/errors"
import { withApiErrorHandling } from "../../../../_lib/api-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params
    const dashboardContext = await assertInternalAdminContext()
    const adminClient = createAdminClient()
    const repository = createReconciliationRepository(adminClient)
    const run = await repository.getRunById(id)

    if (!run) {
      throw new DashboardValidationError("Reconciliation run not found")
    }

    const updatedRun = await retryReconciliationSftpSend({
      reconciliationRepository: repository,
      run,
      supabase: adminClient,
    })

    await recordAuditEvent({
      repository: dashboardContext.metadataRepository,
      event: {
        actorUserId: dashboardContext.user.id,
        actorClientId: dashboardContext.resolvedProfile.profile.clientId,
        eventType: "reconciliation_sftp_retry_requested",
        targetType: "reconciliation_run",
        targetId: run.id,
        metadata: {
          ownerClientId: run.ownerClientId,
          reconciledDate: run.reconciledDate,
          status: updatedRun.status,
        },
      },
    })

    return Response.json({ run: updatedRun })
  }
)
