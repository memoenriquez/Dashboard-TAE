import { resolveTransactionFilters } from "@/features/transactions/filters"

import { DashboardValidationError } from "./errors"

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

  try {
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
  } catch (error) {
    if (error instanceof DashboardValidationError) {
      throw error
    }

    if (error instanceof Error) {
      throw new DashboardValidationError(error.message)
    }

    throw error
  }
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

  throw new DashboardValidationError("Invalid transaction status")
}

const parseExternalClientId = (externalClientId: string | null) => {
  if (!externalClientId || externalClientId === "all") {
    return null
  }

  const value = Number(externalClientId)

  if (!Number.isInteger(value) || value < 1) {
    throw new DashboardValidationError("Invalid external client id")
  }

  return value
}
