import type { Client, Profile } from "@/features/clients/types"

import { DashboardAccessDeniedError } from "./errors"
import type { ResolvedCurrentProfile } from "./types"

export interface ProfileRepository {
  getProfileByUserId: (userId: string) => Promise<Profile | null>
  getClientById: (clientId: string) => Promise<Client | null>
}

export interface ResolveCurrentProfileInput {
  userId: string
  repository: ProfileRepository
}

export interface DashboardUiAccess {
  isInternalAdmin: boolean
}

export const resolveCurrentProfile = async (
  input: ResolveCurrentProfileInput
): Promise<ResolvedCurrentProfile> => {
  const profile = await input.repository.getProfileByUserId(input.userId)

  if (!profile) {
    throw new DashboardAccessDeniedError()
  }

  if (profile.isInternalAdmin) {
    return {
      profile,
      client: null,
    }
  }

  if (!profile.clientId) {
    throw new DashboardAccessDeniedError()
  }

  const client = await input.repository.getClientById(profile.clientId)

  if (!client || !client.isActive) {
    throw new DashboardAccessDeniedError()
  }

  return {
    profile,
    client,
  }
}

export const resolveCurrentDashboardUiAccess = async (
  input: ResolveCurrentProfileInput
): Promise<DashboardUiAccess> => {
  const { profile } = await resolveCurrentProfile(input)

  return {
    isInternalAdmin: profile.isInternalAdmin,
  }
}
