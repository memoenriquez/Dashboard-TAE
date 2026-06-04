import "server-only"

import { recordAuditEvent } from "@/features/audit/audit-service"
import type { AuditEventInput } from "@/features/audit/types"
import { DashboardAccessDeniedError } from "@/features/auth/errors"
import { resolveCurrentProfile } from "@/features/auth/profile"
import type { ResolvedCurrentProfile } from "@/features/auth/types"
import { resolveTransactionScope, type TransactionScope } from "@/features/clients/scope"
import { getCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
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
}

export interface TransactionRequestContext extends DashboardRequestContext {
  scope: TransactionScope
}

export const resolveDashboardMetadataContext =
  async (): Promise<DashboardRequestContext> => {
    const user = await getCurrentUser()

    if (!user) {
      throw new DashboardUnauthorizedError()
    }

    const metadataRepository = createDashboardMetadataRepository(
      await createServerSupabaseClient()
    )
    const resolvedProfile = await resolveCurrentProfile({
      userId: user.id,
      repository: metadataRepository,
    })

    return {
      user,
      metadataRepository,
      resolvedProfile,
    }
  }

export const resolveTransactionRequestContext =
  async (): Promise<TransactionRequestContext> => {
    const context = await resolveDashboardMetadataContext()
    const scope = await resolveTransactionScope({
      profile: context.resolvedProfile.profile,
      repository: context.metadataRepository,
    })

    return {
      ...context,
      scope,
    }
  }

export const recordTrustedAuditEvent = async (event: AuditEventInput): Promise<void> => {
  const metadataRepository = createDashboardMetadataRepository(createAdminClient())

  try {
    await recordAuditEvent({
      repository: metadataRepository,
      event,
    })
  } catch {
    // Authorized reads/exports should not fail solely because audit storage is unavailable.
  }
}

export const assertInternalAdminContext = async (): Promise<DashboardRequestContext> => {
  const context = await resolveDashboardMetadataContext()

  if (!context.resolvedProfile.profile.isInternalAdmin) {
    throw new DashboardAccessDeniedError()
  }
  const metadataRepository = createDashboardMetadataRepository(createAdminClient())

  try {
    await recordAuditEvent({
      repository: metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "internal_admin_accessed",
        targetType: "admin",
        targetId: null,
      },
    })
  } catch {
    // Admin reads should not fail solely because audit storage is temporarily unavailable.
  }

  return {
    ...context,
    metadataRepository,
  }
}
