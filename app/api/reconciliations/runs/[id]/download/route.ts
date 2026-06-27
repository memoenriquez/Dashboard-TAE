import { DashboardAccessDeniedError } from "@/features/auth/errors"
import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import {
  recordTrustedAuditEvent,
  resolveDashboardMetadataContext,
} from "../../../../_lib/dashboard-context"
import { DashboardValidationError } from "../../../../_lib/errors"
import { withApiErrorHandling } from "../../../../_lib/api-route"

export const dynamic = "force-dynamic"

const BUCKET = "reconciliation-files"

export const GET = withApiErrorHandling(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params
    const dashboardContext = await resolveDashboardMetadataContext()
    const adminClient = createAdminClient()
    const run = await createReconciliationRepository(adminClient).getRunById(id)

    if (!run) {
      throw new DashboardValidationError("Reconciliation run not found")
    }

    if (!dashboardContext.resolvedProfile.profile.isInternalAdmin) {
      const client = dashboardContext.resolvedProfile.client
      if (!client || client.id !== run.ownerClientId || client.clientKind === "child") {
        throw new DashboardAccessDeniedError()
      }
    }

    if (!run.storagePath || !run.filename || run.fileDeletedAt) {
      throw new DashboardValidationError("Reconciliation file is not available")
    }

    const { data, error } = await adminClient.storage.from(BUCKET).download(run.storagePath)
    if (error) {
      throw error
    }

    await recordTrustedAuditEvent({
      actorUserId: dashboardContext.user.id,
      actorClientId: dashboardContext.resolvedProfile.profile.clientId,
      eventType: "reconciliation_file_downloaded",
      targetType: "reconciliation_run",
      targetId: run.id,
      metadata: {
        ownerClientId: run.ownerClientId,
        reconciledDate: run.reconciledDate,
      },
    })

    return new Response(data, {
      headers: {
        "content-disposition": `attachment; filename=${run.filename}`,
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }
)
