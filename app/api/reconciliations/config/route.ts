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

    if (ownerClient.clientKind === "standalone" && !input.reconciliationUsername) {
      throw new DashboardValidationError("Missing reconciliation username")
    }

    if (ownerClient.clientKind === "parent") {
      const childClients = await context.metadataRepository.listChildClientsForParent(ownerClient.id)
      const childIds = new Set(childClients.map((child) => child.id))
      const invalidChild = input.childConfigs.find((childConfig) => !childIds.has(childConfig.childClientId))

      if (invalidChild) {
        throw new DashboardValidationError("Child reconciliation config does not belong to this parent")
      }

      const activeChildren = childClients
        .filter((client) => client.isActive && client.externalClientId !== null)
      const configuredChildIds = new Set(input.childConfigs.map((childConfig) => childConfig.childClientId))
      const missingChild = activeChildren.find((child) => !configuredChildIds.has(child.id))

      if (input.isEnabled && missingChild) {
        throw new DashboardValidationError(`Missing reconciliation username for ${missingChild.displayName}`)
      }
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
          deliveryProtocol: config.deliveryProtocol,
          sftpEnabled: config.sftpEnabled,
          cutoffTimezone: config.cutoffTimezone,
        },
      },
    })

    return Response.json({ config })
})
