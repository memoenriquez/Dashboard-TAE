import type { TransactionFilters, TransactionStatusFilter } from "./types"

export interface ResolveTransactionFiltersInput {
  from: string | Date
  to: string | Date
  status?: TransactionStatusFilter
  phoneNumber?: string | null
  operatorName?: "Telcel"
  reference?: string | null
  externalClientId?: number | null
  maxDays: number
}

export const resolveTransactionFilters = (
  input: ResolveTransactionFiltersInput
): TransactionFilters => {
  const from = toDate(input.from, "from")
  const to = toDate(input.to, "to")

  if (from > to) {
    throw new Error("Transaction date range must start before it ends")
  }

  const rangeInDays = (to.getTime() - from.getTime()) / 86_400_000

  if (rangeInDays > input.maxDays) {
    throw new Error(`Transaction date range cannot exceed ${input.maxDays} days`)
  }

  return {
    from,
    to,
    status: input.status ?? "all",
    phoneNumber: normalizeNullableText(input.phoneNumber),
    operatorName: input.operatorName ?? "Telcel",
    reference: normalizeNullableText(input.reference),
    externalClientId: input.externalClientId ?? null,
  }
}

const toDate = (value: string | Date, fieldName: string) => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid transaction ${fieldName} date`)
  }

  return date
}

const normalizeNullableText = (value: string | null | undefined) => {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}
