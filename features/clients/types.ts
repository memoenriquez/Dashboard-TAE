export type ClientKind = "parent" | "child" | "standalone"

export interface Client {
  id: string
  externalClientId: number | null
  displayName: string
  clientKind: ClientKind
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  clientId: string | null
  isInternalAdmin: boolean
  displayName: string
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientGroup {
  id: string
  parentClientId: string
  displayName: string
  createdAt: string
}

export interface ClientGroupWithMembers extends ClientGroup {
  childClients: Client[]
}

export interface ClientGroupMember {
  id: string
  groupId: string
  childClientId: string
  createdAt: string
}

export interface ClientRelationshipSummary {
  clientId: string
  groupCount: number
  childClientCount: number
  parentGroupNames: string[]
}

export interface AdminSetupStatus {
  hasClients: boolean
  hasParentClient: boolean
  hasChildClient: boolean
  hasGroup: boolean
  hasClientUser: boolean
  isComplete: boolean
}
