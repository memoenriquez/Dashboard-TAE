import {
  DashboardInvitationAuthError,
  DashboardInvitationValidationError,
  resendDashboardInvitation,
} from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { requireInternalAdminContext } from "../../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../../_lib/errors"

export const dynamic = "force-dynamic"

export const POST = async (request: Request) => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    const body = (await request.json()) as Partial<{ profileId: string }>

    if (!body.profileId) {
      return Response.json({ error: "Missing profile id" }, { status: 400 })
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
  } catch (error) {
    if (error instanceof DashboardInvitationValidationError) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof DashboardInvitationAuthError) {
      return Response.json({ error: error.message }, { status: 502 })
    }

    return toApiErrorResponse(error)
  }
}

const getAppUrl = (request: Request) =>
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  new URL(request.url).origin
