import "server-only"

import { recordAuditEvent } from "@/features/audit/audit-service"
import { resolveCurrentProfile } from "@/features/auth/profile"
import type { ResolvedCurrentProfile } from "@/features/auth/types"
import { resolveTransactionScope, type TransactionScope } from "@/features/clients/scope"
import { getCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createDashboardMetadataRepository,
  type DashboardMetadataRepository,
} from "@/lib/supabase/metadata-repository"

import { DashboardUnauthorizedError } from "./errors"

export { DashboardUnauthorizedError } from "./errors"

export interface DashboardRequestContext {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  metadataRepository: DashboardMetadataRepository
  resolvedProfile: ResolvedCurrentProfile
  scope: TransactionScope
}

export const resolveDashboardRequestContext =
  async (): Promise<DashboardRequestContext> => {
    const user = await getCurrentUser()

    if (!user) {
      throw new DashboardUnauthorizedError()
    }

    const metadataRepository = createDashboardMetadataRepository(createAdminClient())
    const resolvedProfile = await resolveCurrentProfile({
      userId: user.id,
      repository: metadataRepository,
    })
    const scope = await resolveTransactionScope({
      profile: resolvedProfile.profile,
      repository: metadataRepository,
    })

    return {
      user,
      metadataRepository,
      resolvedProfile,
      scope,
    }
  }

export const requireInternalAdminContext = async () => {
  const context = await resolveDashboardRequestContext()

  if (!context.resolvedProfile.profile.isInternalAdmin) {
    return {
      context,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  await recordAuditEvent({
    repository: context.metadataRepository,
    event: {
      actorUserId: context.user.id,
      actorClientId: context.resolvedProfile.profile.clientId,
      eventType: "internal_admin_accessed",
      targetType: "admin",
      targetId: null,
    },
  })

  return {
    context,
    response: null,
  }
}
