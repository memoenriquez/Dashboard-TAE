import { recordAuditEvent } from "@/features/audit/audit-service"
import {
  AdminValidationError,
  parseAdminClientInput,
} from "@/features/clients/admin-validation"
import type { Client } from "@/features/clients/types"

import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

export const GET = async () => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

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
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

export const POST = async (request: Request) => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    const body = (await request.json()) as Partial<{
      externalClientId: number | null
      displayName: string
      clientKind: Client["clientKind"]
      isActive: boolean
    }>
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
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return toApiErrorResponse(error)
  }
}

export const PATCH = async (request: Request) => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    const body = (await request.json()) as Partial<{
      id: string
      externalClientId: number | null
      displayName: string
      clientKind: Client["clientKind"]
      isActive: boolean
    }>

    if (!body.id) {
      return Response.json({ error: "Missing client id" }, { status: 400 })
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
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return toApiErrorResponse(error)
  }
}
