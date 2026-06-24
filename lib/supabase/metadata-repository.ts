import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { buildClientRelationshipSummaries, buildSetupStatus } from "@/features/clients/admin-metadata"
import type { AuditEventInput } from "@/features/audit/types"
import type {
  AdminSetupStatus,
  Client,
  ClientGroup,
  ClientGroupWithMembers,
  ClientRelationshipSummary,
  Profile,
} from "@/features/clients/types"

import { createAdminClient } from "./admin"

type JsonRecord = Record<string, unknown>
const LAST_SEEN_TOUCH_INTERVAL_MS = 15 * 60 * 1000

export interface DashboardMetadataRepository {
  getProfileByUserId: (userId: string) => Promise<Profile | null>
  getClientById: (clientId: string) => Promise<Client | null>
  listChildClientsForParent: (parentClientId: string) => Promise<Client[]>
  insertAuditEvent: (event: AuditEventInput) => Promise<void>
  listClients: () => Promise<Client[]>
  createClient: (input: CreateClientInput) => Promise<Client>
  updateClient: (input: UpdateClientInput) => Promise<Client>
  listProfiles: () => Promise<Profile[]>
  touchProfileLastSeen: (userId: string) => Promise<void>
  upsertProfile: (input: UpsertProfileInput) => Promise<Profile>
  listGroups: () => Promise<ClientGroup[]>
  listGroupsWithMembers: () => Promise<ClientGroupWithMembers[]>
  updateGroup: (input: UpdateGroupInput) => Promise<ClientGroup>
  replaceGroupMembers: (input: ReplaceGroupMembersInput) => Promise<void>
  createGroup: (input: CreateGroupInput) => Promise<ClientGroup>
  listClientRelationshipSummaries: () => Promise<Record<string, ClientRelationshipSummary>>
  getSetupStatus: () => Promise<AdminSetupStatus>
}

export interface CreateClientInput {
  externalClientId: number | null
  displayName: string
  clientKind: Client["clientKind"]
  isActive?: boolean
}

export interface UpdateClientInput extends CreateClientInput {
  id: string
}

export interface UpsertProfileInput {
  id: string
  clientId: string | null
  isInternalAdmin: boolean
  displayName: string
}

export interface CreateGroupInput {
  parentClientId: string
  displayName: string
  childClientIds?: string[]
}

export interface UpdateGroupInput {
  id: string
  parentClientId: string
  displayName: string
}

export interface ReplaceGroupMembersInput {
  groupId: string
  childClientIds: string[]
}

export const createDashboardMetadataRepository = (
  supabase: SupabaseClient
): DashboardMetadataRepository => ({
  getProfileByUserId: async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapProfile(data as JsonRecord) : null
  },
  getClientById: async (clientId) => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapClient(data as JsonRecord) : null
  },
  listChildClientsForParent: async (parentClientId) => {
    const { data: groups, error: groupsError } = await supabase
      .from("client_groups")
      .select("id")
      .eq("parent_client_id", parentClientId)

    if (groupsError) {
      throw groupsError
    }

    const groupIds = ((groups ?? []) as JsonRecord[])
      .map((group) => String(group.id))
      .filter(Boolean)

    if (groupIds.length === 0) {
      return []
    }

    const { data: members, error: membersError } = await supabase
      .from("client_group_members")
      .select("child_client_id")
      .in("group_id", groupIds)

    if (membersError) {
      throw membersError
    }

    const childClientIds = ((members ?? []) as JsonRecord[])
      .map((member) => String(member.child_client_id))
      .filter(Boolean)

    if (childClientIds.length === 0) {
      return []
    }

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .in("id", childClientIds)

    if (clientsError) {
      throw clientsError
    }

    return ((clients ?? []) as JsonRecord[]).map(mapClient)
  },
  insertAuditEvent: async (event) => {
    const { error } = await supabase.from("audit_events").insert({
      actor_user_id: event.actorUserId,
      actor_client_id: event.actorClientId,
      event_type: event.eventType,
      target_type: event.targetType,
      target_id: event.targetId,
      metadata: event.metadata ?? {},
    })

    if (error) {
      throw error
    }
  },
  listClients: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("display_name", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapClient)
  },
  createClient: async (input) => {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        external_client_id: input.externalClientId,
        display_name: input.displayName,
        client_kind: input.clientKind,
        is_active: input.isActive ?? true,
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapClient(data as JsonRecord)
  },
  updateClient: async (input) => {
    const { data, error } = await supabase
      .from("clients")
      .update({
        external_client_id: input.externalClientId,
        display_name: input.displayName,
        client_kind: input.clientKind,
        is_active: input.isActive ?? true,
      })
      .eq("id", input.id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapClient(data as JsonRecord)
  },
  listProfiles: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapProfile)
  },
  touchProfileLastSeen: async (userId) => {
    const adminClient = createAdminClient()
    const staleBefore = new Date(Date.now() - LAST_SEEN_TOUCH_INTERVAL_MS).toISOString()
    const { error } = await adminClient
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .or(`last_seen_at.is.null,last_seen_at.lt.${staleBefore}`)

    if (error) {
      throw error
    }
  },
  upsertProfile: async (input) => {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: input.id,
        client_id: input.clientId,
        is_internal_admin: input.isInternalAdmin,
        display_name: input.displayName,
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapProfile(data as JsonRecord)
  },
  listGroups: async () => {
    const { data, error } = await supabase
      .from("client_groups")
      .select("*")
      .order("display_name", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapClientGroup)
  },
  listGroupsWithMembers: async () => {
    const { data: groups, error: groupsError } = await supabase
      .from("client_groups")
      .select("*")
      .order("display_name", { ascending: true })

    if (groupsError) {
      throw groupsError
    }

    const mappedGroups = ((groups ?? []) as JsonRecord[]).map(mapClientGroup)

    if (mappedGroups.length === 0) {
      return []
    }

    const groupIds = mappedGroups.map((group) => group.id)
    const { data: members, error: membersError } = await supabase
      .from("client_group_members")
      .select("group_id, child_client_id")
      .in("group_id", groupIds)

    if (membersError) {
      throw membersError
    }

    const mappedMembers = (members ?? []) as JsonRecord[]
    const childClientIds = Array.from(
      new Set(mappedMembers.map((member) => String(member.child_client_id)).filter(Boolean))
    )

    const clientsById = new Map<string, Client>()

    if (childClientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .in("id", childClientIds)

      if (clientsError) {
        throw clientsError
      }

      ((clients ?? []) as JsonRecord[]).map(mapClient).forEach((client) => {
        clientsById.set(client.id, client)
      })
    }

    return mappedGroups.map((group) => ({
      ...group,
      childClients: mappedMembers
        .filter((member) => String(member.group_id) === group.id)
        .map((member) => clientsById.get(String(member.child_client_id)))
        .filter((client): client is Client => Boolean(client)),
    }))
  },
  updateGroup: async (input) => {
    const { data, error } = await supabase
      .from("client_groups")
      .update({
        parent_client_id: input.parentClientId,
        display_name: input.displayName,
      })
      .eq("id", input.id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapClientGroup(data as JsonRecord)
  },
  replaceGroupMembers: async (input) => {
    const { error } = await supabase.rpc("replace_group_members", {
      group_id: input.groupId,
      child_client_ids: input.childClientIds,
    })

    if (error) {
      throw error
    }
  },
  createGroup: async (input) => {
    const { data, error } = await supabase
      .from("client_groups")
      .insert({
        parent_client_id: input.parentClientId,
        display_name: input.displayName,
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    const group = mapClientGroup(data as JsonRecord)
    const childClientIds = input.childClientIds ?? []

    if (childClientIds.length > 0) {
      const { error: membersError } = await supabase
        .from("client_group_members")
        .insert(
          childClientIds.map((childClientId) => ({
            group_id: group.id,
            child_client_id: childClientId,
          }))
        )

      if (membersError) {
        throw membersError
      }
    }

    return group
  },
  listClientRelationshipSummaries: async () => {
    const [clients, groups] = await Promise.all([
      createDashboardMetadataRepository(supabase).listClients(),
      createDashboardMetadataRepository(supabase).listGroupsWithMembers(),
    ])

    return buildClientRelationshipSummaries(clients, groups)
  },
  getSetupStatus: async () => {
    const [clients, groups, profiles] = await Promise.all([
      createDashboardMetadataRepository(supabase).listClients(),
      createDashboardMetadataRepository(supabase).listGroupsWithMembers(),
      createDashboardMetadataRepository(supabase).listProfiles(),
    ])

    return buildSetupStatus({ clients, groups, profiles })
  },
})

const mapClient = (row: JsonRecord): Client => ({
  id: String(row.id),
  externalClientId:
    row.external_client_id === null || row.external_client_id === undefined
      ? null
      : Number(row.external_client_id),
  displayName: String(row.display_name),
  clientKind: row.client_kind as Client["clientKind"],
  isActive: Boolean(row.is_active),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapProfile = (row: JsonRecord): Profile => ({
  id: String(row.id),
  clientId: row.client_id ? String(row.client_id) : null,
  isInternalAdmin: Boolean(row.is_internal_admin),
  displayName: String(row.display_name),
  lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapClientGroup = (row: JsonRecord): ClientGroup => ({
  id: String(row.id),
  parentClientId: String(row.parent_client_id),
  displayName: String(row.display_name),
  createdAt: String(row.created_at),
})
