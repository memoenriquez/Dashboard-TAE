import { DashboardAccessDeniedError } from "@/features/auth/errors"

import type { Client, Profile } from "./types"

export interface ScopeRepository {
  getClientById: (clientId: string) => Promise<Client | null>
  listChildClientsForParent: (parentClientId: string) => Promise<Client[]>
  listClients?: () => Promise<Client[]>
}

export interface ResolveTransactionScopeInput {
  profile: Profile
  repository: ScopeRepository
}

export type TransactionScope =
  | { type: "global" }
  | { type: "external_client_ids"; externalClientIds: number[] }

export interface TransactionClientOption {
  id: string
  externalClientId: number
  displayName: string
  clientKind: Client["clientKind"]
}

export const resolveTransactionScope = async (
  input: ResolveTransactionScopeInput
): Promise<TransactionScope> => {
  const { profile, repository } = input

  if (profile.isInternalAdmin) {
    return { type: "global" }
  }

  if (!profile.clientId) {
    throw new DashboardAccessDeniedError()
  }

  const client = await repository.getClientById(profile.clientId)

  if (!client || !client.isActive) {
    throw new DashboardAccessDeniedError()
  }

  if (client.clientKind !== "parent") {
    if (client.externalClientId === null) {
      throw new DashboardAccessDeniedError()
    }

    return {
      type: "external_client_ids",
      externalClientIds: [client.externalClientId],
    }
  }

  const childClients = await repository.listChildClientsForParent(client.id)
  const parentExternalIds =
    client.externalClientId === null ? [] : [client.externalClientId]
  const activeChildExternalIds = childClients
    .filter((childClient) => childClient.isActive)
    .map((childClient) => childClient.externalClientId)
    .filter((externalClientId): externalClientId is number => externalClientId !== null)

  return {
    type: "external_client_ids",
    externalClientIds: Array.from(new Set([...parentExternalIds, ...activeChildExternalIds])),
  }
}

export const listAvailableTransactionClients = async (input: {
  client: Client | null
  isInternalAdmin?: boolean
  repository: ScopeRepository
}): Promise<TransactionClientOption[]> => {
  const { client, repository } = input

  if (input.isInternalAdmin) {
    const clients = await repository.listClients?.()

    return getUniqueTransactionClientOptions(clients ?? [])
  }

  if (!client || !client.isActive) {
    return []
  }

  if (client.clientKind !== "parent") {
    if (client.externalClientId === null) {
      return []
    }

    return [toTransactionClientOption(client)]
  }

  const childClients = await repository.listChildClientsForParent(client.id)
  return getUniqueTransactionClientOptions([
    client,
    ...childClients.filter((childClient) => childClient.isActive),
  ])
}

export const applyExternalClientFilterToScope = (
  scope: TransactionScope,
  externalClientId: number | null
): TransactionScope => {
  if (externalClientId === null) {
    return scope
  }

  if (scope.type === "global") {
    return {
      type: "external_client_ids",
      externalClientIds: [externalClientId],
    }
  }

  if (!scope.externalClientIds.includes(externalClientId)) {
    throw new DashboardAccessDeniedError()
  }

  return {
    type: "external_client_ids",
    externalClientIds: [externalClientId],
  }
}

const getUniqueTransactionClientOptions = (clients: Client[]) => {
  const availableClients = clients
    .filter((availableClient) => availableClient.isActive)
    .filter((availableClient) => availableClient.externalClientId !== null)
    .map((availableClient) => toTransactionClientOption(availableClient))

  return Array.from(
    new Map(
      availableClients.map((availableClient) => [
        availableClient.externalClientId,
        availableClient,
      ])
    ).values()
  )
}

const toTransactionClientOption = (client: Client): TransactionClientOption => {
  if (client.externalClientId === null) {
    throw new DashboardAccessDeniedError()
  }

  return {
    id: client.id,
    externalClientId: client.externalClientId,
    displayName: client.displayName,
    clientKind: client.clientKind,
  }
}
