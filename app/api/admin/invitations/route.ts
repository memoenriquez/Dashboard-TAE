import {
  DashboardInvitationAuthError,
  DashboardInvitationValidationError,
  inviteDashboardUser,
} from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

export const POST = async (request: Request) => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    const body = (await request.json()) as Partial<{
      email: string
      displayName: string
      clientId: string
    }>
    const adminClient = createAdminClient()

    const profile = await inviteDashboardUser({
      authAdmin: {
        inviteUserByEmail: async (email, options) => {
          const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
            email,
            options
          )

          if (error) {
            throw error
          }

          if (!data.user?.id) {
            throw new Error("Supabase did not return an invited user")
          }

          return { userId: data.user.id, email: data.user.email ?? null }
        },
      },
      repository: context.metadataRepository,
      actorUserId: context.user.id,
      actorClientId: context.resolvedProfile.profile.clientId,
      appUrl: getAppUrl(request),
      input: {
        email: body.email ?? "",
        displayName: body.displayName ?? "",
        clientId: body.clientId ?? "",
      },
    })

    return Response.json({ profile }, { status: 201 })
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
