import { describe, expect, it } from "vitest"

import {
  buildClientRelationshipSummaries,
  buildSetupStatus,
} from "./admin-metadata"
import type { Client, ClientGroupWithMembers, Profile } from "./types"

const baseTimestamp = "2026-01-01T00:00:00.000Z"

const createClient = (overrides: Partial<Client> & Pick<Client, "id" | "clientKind">): Client => {
  const { id, clientKind, ...rest } = overrides

  return {
    id,
    externalClientId: 100,
    displayName: `Cliente ${id}`,
    clientKind,
    isActive: true,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    ...rest,
  }
}

const createGroup = (
  overrides: Partial<ClientGroupWithMembers> & Pick<ClientGroupWithMembers, "id" | "parentClientId">
): ClientGroupWithMembers => {
  const { id, parentClientId, ...rest } = overrides

  return {
    id,
    parentClientId,
    displayName: `Grupo ${id}`,
    childClients: [],
    createdAt: baseTimestamp,
    ...rest,
  }
}

const createProfile = (overrides: Partial<Profile>): Profile => ({
  id: "profile-1",
  clientId: null,
  isInternalAdmin: false,
  displayName: "Usuario Demo",
  lastSeenAt: null,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  ...overrides,
})

describe("buildClientRelationshipSummaries", () => {
  it("summarizes parent and child group relationships", () => {
    const parent = createClient({ id: "parent-1", clientKind: "parent" })
    const childOne = createClient({ id: "child-1", clientKind: "child", externalClientId: 201 })
    const childTwo = createClient({ id: "child-2", clientKind: "child", externalClientId: 202 })
    const standalone = createClient({ id: "standalone-1", clientKind: "standalone" })
    const groups = [
      createGroup({
        id: "group-1",
        parentClientId: parent.id,
        displayName: "Zona Norte",
        childClients: [childOne, childTwo],
      }),
      createGroup({
        id: "group-2",
        parentClientId: parent.id,
        displayName: "Zona Centro",
        childClients: [childOne],
      }),
    ]

    expect(buildClientRelationshipSummaries([parent, childOne, childTwo, standalone], groups)).toEqual({
      [parent.id]: {
        clientId: parent.id,
        groupCount: 2,
        childClientCount: 2,
        parentGroupNames: [],
      },
      [childOne.id]: {
        clientId: childOne.id,
        groupCount: 2,
        childClientCount: 0,
        parentGroupNames: ["Zona Norte", "Zona Centro"],
      },
      [childTwo.id]: {
        clientId: childTwo.id,
        groupCount: 1,
        childClientCount: 0,
        parentGroupNames: ["Zona Norte"],
      },
      [standalone.id]: {
        clientId: standalone.id,
        groupCount: 0,
        childClientCount: 0,
        parentGroupNames: [],
      },
    })
  })
})

describe("buildSetupStatus", () => {
  it("marks the setup as complete only when clients, groups, users and dashboard review are ready", () => {
    const parent = createClient({ id: "parent-1", clientKind: "parent" })
    const child = createClient({ id: "child-1", clientKind: "child", externalClientId: 201 })
    const group = createGroup({
      id: "group-1",
      parentClientId: parent.id,
      childClients: [child],
    })
    const user = createProfile({ id: "user-1", clientId: parent.id })

    expect(buildSetupStatus({ clients: [parent, child], groups: [group], profiles: [user] })).toEqual({
      hasClients: true,
      hasParentClient: true,
      hasChildClient: true,
      hasGroup: true,
      hasClientUser: true,
      isComplete: true,
    })
  })

  it("shows missing prerequisites when no client structure exists", () => {
    expect(buildSetupStatus({ clients: [], groups: [], profiles: [] })).toEqual({
      hasClients: false,
      hasParentClient: false,
      hasChildClient: false,
      hasGroup: false,
      hasClientUser: false,
      isComplete: false,
    })
  })
})
