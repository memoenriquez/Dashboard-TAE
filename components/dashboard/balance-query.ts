import type { DashboardClientContext, DashboardClientOption } from "./types"

export const getBalanceQueryExternalClientId = (
  appliedExternalClientId: string,
  availableClients: DashboardClientOption[],
  currentClient: DashboardClientContext | null
) => {
  if (appliedExternalClientId !== "all") {
    return appliedExternalClientId
  }

  if (
    availableClients.length === 1 &&
    (currentClient?.clientKind === "child" || currentClient?.clientKind === "standalone")
  ) {
    return String(availableClients[0].externalClientId)
  }

  return null
}

export const buildBalanceQueryUrl = (externalClientId: string) => {
  const params = new URLSearchParams({ externalClientId })

  return `/api/accounts/balance?${params.toString()}`
}

export const shouldShowClientFilter = (
  availableClients: DashboardClientOption[],
  currentClient: DashboardClientContext | null
) => {
  if (availableClients.length > 1) {
    return true
  }

  return currentClient?.clientKind === "admin" || currentClient?.clientKind === "parent"
}
