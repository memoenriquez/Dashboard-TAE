import type { TransactionFilterState } from "./filter-bar"
import type { DashboardClientOption } from "./types"

export const buildMetricsQueryUrl = (filters: TransactionFilterState) => {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    status: filters.status,
  })

  if (filters.phoneNumber) {
    params.set("phoneNumber", filters.phoneNumber)
  }

  if (filters.reference) {
    params.set("reference", filters.reference)
  }

  if (filters.externalClientId !== "all") {
    params.set("externalClientId", filters.externalClientId)
  }

  return `/api/transactions/metrics?${params.toString()}`
}

export const shouldShowClientRanking = (availableClients: DashboardClientOption[]) =>
  availableClients.length > 1
