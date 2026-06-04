import { recordAuditEvent } from "@/features/audit/audit-service"
import { parseAdminGroupInput } from "@/features/clients/admin-validation"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async () => {
    const context = await assertInternalAdminContext()

    return Response.json({ groups: await context.metadataRepository.listGroupsWithMembers() })
})

export const PATCH = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)

    if (typeof body.id !== "string" || !body.id) {
      throw new DashboardValidationError("Missing group id")
    }

    const input = parseAdminGroupInput(body)

    const parentClient = await context.metadataRepository.getClientById(input.parentClientId)
    if (!parentClient || parentClient.clientKind !== "parent") {
      throw new DashboardValidationError("Group parent must be a parent client")
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
      throw new DashboardValidationError("Group members must be active child clients")
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
})

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)
    const input = parseAdminGroupInput(body)

    const parentClient = await context.metadataRepository.getClientById(input.parentClientId)
    if (!parentClient || parentClient.clientKind !== "parent") {
      throw new DashboardValidationError("Group parent must be a parent client")
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
      throw new DashboardValidationError("Group members must be active child clients")
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
})
