import { recordAuditEvent } from "@/features/audit/audit-service"
import {
  AdminValidationError,
  parseAdminGroupInput,
} from "@/features/clients/admin-validation"

import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

export const GET = async () => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    return Response.json({ groups: await context.metadataRepository.listGroupsWithMembers() })
  } catch (error) {
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
      parentClientId: string
      displayName: string
      childClientIds: string[]
    }>

    if (!body.id) {
      return Response.json({ error: "Missing group id" }, { status: 400 })
    }

    const input = parseAdminGroupInput(body)

    const parentClient = await context.metadataRepository.getClientById(input.parentClientId)
    if (!parentClient || parentClient.clientKind !== "parent") {
      return Response.json({ error: "Group parent must be a parent client" }, { status: 400 })
    }

    const childClients = await Promise.all(
      input.childClientIds.map((childClientId) =>
        context.metadataRepository.getClientById(childClientId)
      )
    )

    if (
      childClients.some(
        (client) => !client || client.clientKind !== "child" || !client.isActive
      )
    ) {
      return Response.json(
        { error: "Group members must be active child clients" },
        { status: 400 }
      )
    }

    const group = await context.metadataRepository.updateGroup({
      id: body.id,
      parentClientId: input.parentClientId,
      displayName: input.displayName,
    })

    await context.metadataRepository.replaceGroupMembers({
      groupId: group.id,
      childClientIds: input.childClientIds,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "permission_changed",
        targetType: "client_group",
        targetId: group.id,
      },
    })

    return Response.json({ group })
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

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
      parentClientId: string
      displayName: string
      childClientIds: string[]
    }>
    const input = parseAdminGroupInput(body)

    const parentClient = await context.metadataRepository.getClientById(input.parentClientId)
    if (!parentClient || parentClient.clientKind !== "parent") {
      return Response.json({ error: "Group parent must be a parent client" }, { status: 400 })
    }

    const childClients = await Promise.all(
      input.childClientIds.map((childClientId) =>
        context.metadataRepository.getClientById(childClientId)
      )
    )

    if (
      childClients.some(
        (client) => !client || client.clientKind !== "child" || !client.isActive
      )
    ) {
      return Response.json(
        { error: "Group members must be active child clients" },
        { status: 400 }
      )
    }

    const group = await context.metadataRepository.createGroup({
      parentClientId: input.parentClientId,
      displayName: input.displayName,
      childClientIds: input.childClientIds,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "permission_changed",
        targetType: "client_group",
        targetId: group.id,
      },
    })

    return Response.json({ group }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return toApiErrorResponse(error)
  }
}
