import type { Client, Profile } from "@/features/clients/types"

export interface ResolvedCurrentProfile {
  profile: Profile
  client: Client | null
}
