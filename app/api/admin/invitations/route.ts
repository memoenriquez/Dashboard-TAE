import { inviteDashboardUser } from "@/features/auth/invitations"
import { createAdminClient } from "@/lib/supabase/admin"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { readJsonObject } from "../../_lib/request-body"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

export const POST = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const body = await readJsonObject(request)
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
        email: typeof body.email === "string" ? body.email : "",
        displayName: typeof body.displayName === "string" ? body.displayName : "",
        clientId: typeof body.clientId === "string" ? body.clientId : "",
      },
    })

    return Response.json({ profile }, { status: 201 })
})

const getAppUrl = (request: Request) =>
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  new URL(request.url).origin
