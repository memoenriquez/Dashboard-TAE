import { recordAuditEvent } from "@/features/audit/audit-service"
import { getDashboardInvitationStatus } from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/route"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async () => {
    const context = await assertInternalAdminContext()

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
})

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)

    if (typeof body.id !== "string" || typeof body.displayName !== "string") {
      throw new DashboardValidationError("Missing required profile fields")
    }

    const isCurrentAdminProfile =
      body.id === context.user.id && context.resolvedProfile.profile.isInternalAdmin
    const isInternalAdmin = isCurrentAdminProfile
      ? true
      : body.isInternalAdmin === true

    if (isInternalAdmin && body.id !== context.user.id) {
      throw new DashboardValidationError(
        "Only the current dashboard owner can be an internal admin"
      )
    }

    const clientId = typeof body.clientId === "string" ? body.clientId : null

    if (!isInternalAdmin && !clientId) {
      throw new DashboardValidationError("Client profiles must be linked to a client")
    }

    const profile = await context.metadataRepository.upsertProfile({
      id: body.id,
      clientId,
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
})

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
