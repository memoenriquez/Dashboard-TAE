import type {
  AdminSetupStatus,
  Client,
  ClientGroupWithMembers,
  ClientRelationshipSummary,
  Profile,
} from "./types"

export const buildClientRelationshipSummaries = (
  clients: Client[],
  groups: ClientGroupWithMembers[]
): Record<string, ClientRelationshipSummary> => {
  const summaries = Object.fromEntries(
    clients.map((client) => [
      client.id,
      {
        clientId: client.id,
        groupCount: 0,
        childClientCount: 0,
        parentGroupNames: [],
      },
    ])
  ) as Record<string, ClientRelationshipSummary>

  groups.forEach((group) => {
    const parentSummary = summaries[group.parentClientId]

    if (parentSummary) {
      parentSummary.groupCount += 1
      group.childClients.forEach((childClient) => {
        if (!parentSummary.parentGroupNames.includes(childClient.id)) {
          parentSummary.parentGroupNames.push(childClient.id)
        }
      })
      parentSummary.childClientCount = parentSummary.parentGroupNames.length
    }

    group.childClients.forEach((childClient) => {
      const childSummary = summaries[childClient.id]

      if (!childSummary) {
        return
      }

      childSummary.groupCount += 1
      childSummary.parentGroupNames.push(group.displayName)
    })
  })

  Object.values(summaries).forEach((summary) => {
    if (summary.childClientCount > 0) {
      summary.parentGroupNames = []
    }
  })

  return summaries
}

export const buildSetupStatus = (input: {
  clients: Client[]
  groups: ClientGroupWithMembers[]
  profiles: Profile[]
}): AdminSetupStatus => {
  const hasParentClient = input.clients.some((client) => client.clientKind === "parent")
  const hasChildClient = input.clients.some((client) => client.clientKind === "child")
  const hasGroup = input.groups.some((group) => group.childClients.length > 0)
  const hasClientUser = input.profiles.some(
    (profile) => !profile.isInternalAdmin && profile.clientId !== null
  )

  return {
    hasClients: input.clients.length > 0,
    hasParentClient,
    hasChildClient,
    hasGroup,
    hasClientUser,
    isComplete: hasParentClient && hasChildClient && hasGroup && hasClientUser,
  }
}
