import { recordAuditEvent } from "@/features/audit/audit-service"
import { getDashboardInvitationStatus } from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

export const GET = async () => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    const [profiles, authUsersById] = await Promise.all([
      context.metadataRepository.listProfiles(),
      listAuthUsersById(),
    ])

    return Response.json({
      profiles: profiles.map((profile) => {
        const authUser = authUsersById.get(profile.id)
        const invitedAt = authUser?.invitedAt ?? null
        const emailConfirmedAt = authUser?.emailConfirmedAt ?? null

        return {
          ...profile,
          email: authUser?.email ?? null,
          invitedAt,
          emailConfirmedAt,
          lastSignInAt: authUser?.lastSignInAt ?? null,
          invitationStatus: getDashboardInvitationStatus({
            invitedAt,
            emailConfirmedAt,
          }),
        }
      }),
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
      id: string
      clientId: string | null
      isInternalAdmin: boolean
      displayName: string
    }>

    if (!body.id || !body.displayName) {
      return Response.json({ error: "Missing required profile fields" }, { status: 400 })
    }

    const isCurrentAdminProfile =
      body.id === context.user.id && context.resolvedProfile.profile.isInternalAdmin
    const isInternalAdmin = isCurrentAdminProfile
      ? true
      : body.isInternalAdmin ?? false

    if (isInternalAdmin && body.id !== context.user.id) {
      return Response.json(
        { error: "Only the current dashboard owner can be an internal admin" },
        { status: 400 }
      )
    }

    if (!isInternalAdmin && !body.clientId) {
      return Response.json(
        { error: "Client profiles must be linked to a client" },
        { status: 400 }
      )
    }

    const profile = await context.metadataRepository.upsertProfile({
      id: body.id,
      clientId: body.clientId ?? null,
      isInternalAdmin,
      displayName: body.displayName,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "permission_changed",
        targetType: "profile",
        targetId: profile.id,
      },
    })

    return Response.json({ profile }, { status: 201 })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

const listAuthUsersById = async () => {
  const adminClient = createAdminClient()
  const usersById = new Map<
    string,
    {
      email: string | null
      invitedAt: string | null
      emailConfirmedAt: string | null
      lastSignInAt: string | null
    }
  >()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    data.users.forEach((user) => {
      usersById.set(user.id, {
        email: user.email ?? null,
        invitedAt: user.invited_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
      })
    })

    if (data.users.length < perPage) {
      return usersById
    }

    page += 1
  }
}
