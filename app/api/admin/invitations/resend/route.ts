import { resendDashboardInvitation } from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { assertInternalAdminContext } from "../../../_lib/dashboard-context"
import { DashboardValidationError } from "../../../_lib/errors"
import { readJsonObject } from "../../../_lib/request-body"
import { withApiErrorHandling } from "../../../_lib/api-route"

export const dynamic = "force-dynamic"

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)

    if (typeof body.profileId !== "string" || !body.profileId) {
      throw new DashboardValidationError("Missing profile id")
    }

    const profile = await context.metadataRepository.getProfileByUserId(
      body.profileId
    )

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.auth.admin.getUserById(profile.id)

    if (error) {
      throw error
    }

    if (!data.user) {
      return Response.json({ error: "Auth user not found" }, { status: 404 })
    }

    const result = await resendDashboardInvitation({
      authAdmin: {
        inviteUserByEmail: async (email, options) => {
          const { data: invitationData, error: invitationError } =
            await adminClient.auth.admin.inviteUserByEmail(email, options)

          if (invitationError) {
            throw invitationError
          }

          if (!invitationData.user?.id) {
            throw new Error("Supabase did not return an invited user")
          }

          return {
            userId: invitationData.user.id,
            email: invitationData.user.email ?? null,
          }
        },
      },
      repository: context.metadataRepository,
      actorUserId: context.user.id,
      actorClientId: context.resolvedProfile.profile.clientId,
      appUrl: getAppUrl(request),
      profile,
      authUser: {
        id: data.user.id,
        email: data.user.email ?? null,
        invitedAt: data.user.invited_at ?? null,
        emailConfirmedAt: data.user.email_confirmed_at ?? null,
        lastSignInAt: data.user.last_sign_in_at ?? null,
      },
    })

    return Response.json(result)
})

const getAppUrl = (request: Request) =>
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  new URL(request.url).origin
