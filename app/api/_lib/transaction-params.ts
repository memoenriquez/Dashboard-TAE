import { resolveTransactionFilters } from "@/features/transactions/filters"

export const getTransactionQueryDefaults = () => ({
  defaultDays: Number(process.env.TRANSACTION_QUERY_DEFAULT_DAYS ?? 7),
  maxDays: Number(process.env.TRANSACTION_QUERY_MAX_DAYS ?? 90),
})

export const parseTransactionSearchParams = (searchParams: URLSearchParams) => {
  const { defaultDays, maxDays } = getTransactionQueryDefaults()
  const to = searchParams.get("to")
    ? new Date(String(searchParams.get("to")))
    : new Date()
  const from = searchParams.get("from")
    ? new Date(String(searchParams.get("from")))
    : new Date(to.getTime() - defaultDays * 86_400_000)

  return resolveTransactionFilters({
    from,
    to,
    status: parseStatus(searchParams.get("status")),
    phoneNumber: searchParams.get("phoneNumber"),
    operatorName: "Telcel",
    reference: searchParams.get("reference"),
    externalClientId: parseExternalClientId(searchParams.get("externalClientId")),
    maxDays,
  })
}

export const parsePositiveInteger = (
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
  maxValue: number
) => {
  const value = Number(searchParams.get(key) ?? fallback)

  if (!Number.isInteger(value) || value < 1) {
    return fallback
  }

  return Math.min(value, maxValue)
}

const parseStatus = (status: string | null) => {
  if (!status || status === "all") {
    return "all"
  }

  if (status === "successful" || status === "failed") {
    return status
  }

  throw new Error("Invalid transaction status")
}

const parseExternalClientId = (externalClientId: string | null) => {
  if (!externalClientId || externalClientId === "all") {
    return null
  }

  const value = Number(externalClientId)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Invalid external client id")
  }

  return value
}
