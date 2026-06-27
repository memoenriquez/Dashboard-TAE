import { recordAuditEvent } from "@/features/audit/audit-service"
import { parseReconciliationConfigInput } from "@/features/reconciliation/validation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

export const PATCH = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()
    const body = await readJsonObject(request)
    const input = parseReconciliationConfigInput(body)
    const ownerClient = await context.metadataRepository.getClientById(input.ownerClientId)

    if (!ownerClient || ownerClient.clientKind === "child") {
      throw new DashboardValidationError("Reconciliation owner must be parent or standalone")
    }

    const repository = createReconciliationRepository(createAdminClient())
    const config = await repository.upsertConfig(input)

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "reconciliation_config_changed",
        targetType: "reconciliation_config",
        targetId: config.id,
        metadata: {
          ownerClientId: config.ownerClientId,
          sftpEnabled: config.sftpEnabled,
          cutoffTimezone: config.cutoffTimezone,
        },
      },
    })

    return Response.json({ config })
})
