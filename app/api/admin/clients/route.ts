import { recordAuditEvent } from "@/features/audit/audit-service"
import { parseAdminClientInput } from "@/features/clients/admin-validation"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async () => {
    const context = await assertInternalAdminContext()

    const [clients, relationshipSummaries] = await Promise.all([
      context.metadataRepository.listClients(),
      context.metadataRepository.listClientRelationshipSummaries(),
    ])

    return Response.json({
      clients: clients.map((client) => ({
        ...client,
        relationshipSummary: relationshipSummaries[client.id],
      })),
    })
})

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)
    const input = parseAdminClientInput(body)

    const client = await context.metadataRepository.createClient({
      externalClientId: input.externalClientId,
      displayName: input.displayName,
      clientKind: input.clientKind,
      isActive: input.isActive,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "client_mapping_changed",
        targetType: "client",
        targetId: client.id,
      },
    })

    return Response.json({ client }, { status: 201 })
})

export const PATCH = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)

    if (typeof body.id !== "string" || !body.id) {
      throw new DashboardValidationError("Missing client id")
    }

    const input = parseAdminClientInput(body)
    const client = await context.metadataRepository.updateClient({
      id: body.id,
      externalClientId: input.externalClientId,
      displayName: input.displayName,
      clientKind: input.clientKind,
      isActive: input.isActive,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "client_mapping_changed",
        targetType: "client",
        targetId: client.id,
      },
    })

    return Response.json({ client })
})
