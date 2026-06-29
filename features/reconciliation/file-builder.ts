import type { NormalizedTransactionRecord } from "@/features/transactions/types"

import type { ReconciliationFileInput, ReconciliationFileResult } from "./types"

export class ReconciliationFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReconciliationFileError"
  }
}

export const createReconciliationFile = (
  input: ReconciliationFileInput
): ReconciliationFileResult => {
  const filenameDateStamp = formatDateStamp(input.reconciledDate, input.cutoffTimezone, input.filenameDateFormat)
  const contentDateStamp = formatDateStamp(input.reconciledDate, input.cutoffTimezone, input.contentDateFormat)
  const validationDateStamp = formatDateStamp(input.reconciledDate, input.cutoffTimezone, "ddmmaaaa")
  const successfulTransactions = input.transactions.filter(
    (transaction) => transaction.status === "successful"
  )
  const validationErrors = successfulTransactions
    .map((transaction) => validateTransaction(transaction, validationDateStamp, input.cutoffTimezone))
    .filter((error): error is string => Boolean(error))

  if (validationErrors.length > 0) {
    const shownErrors = validationErrors.slice(0, 10).join("; ")
    const suffix = validationErrors.length > 10 ? `; +${validationErrors.length - 10} more` : ""

    throw new ReconciliationFileError(
      `Invalid reconciliation data (${validationErrors.length}): ${shownErrors}${suffix}`
    )
  }

  const details = successfulTransactions.map((transaction) =>
    formatDetailLine(transaction, contentDateStamp)
  )
  const filename = `${input.reconciliationUsername}_${filenameDateStamp}_TAE_${input.filenameTimeDifference}.txt`
  const lines = [`HDR${contentDateStamp}`, ...details]

  return {
    filename,
    content: `${lines.join("\r\n")}\r\n`,
    transactionCount: details.length,
    totalAmount: input.transactions.reduce(
      (total, transaction) =>
        transaction.status === "successful" ? total + transaction.soldAmount : total,
      0
    ),
  }
}

const validateTransaction = (
  transaction: NormalizedTransactionRecord,
  dateStamp: string,
  cutoffTimezone: string
) => {
  if (!isTenDigitValue(transaction.phoneNumber)) {
    return `Invalid phone number for transaction ${transaction.ticket}`
  }

  const authorization = transaction.authorization?.trim() ?? ""
  if (!/^\d{1,10}$/.test(authorization)) {
    return `Invalid authorization for transaction ${transaction.ticket}`
  }

  if (!Number.isInteger(transaction.soldAmount) || transaction.soldAmount < 0 || transaction.soldAmount > 9999) {
    return `Invalid amount for transaction ${transaction.ticket}`
  }

  const transactionDateStamp = formatDateStamp(new Date(transaction.occurredAt), cutoffTimezone, "ddmmaaaa")
  if (transactionDateStamp !== dateStamp) {
    return `Transaction ${transaction.ticket} is outside reconciled date`
  }

  return null
}

const formatDetailLine = (
  transaction: NormalizedTransactionRecord,
  dateStamp: string
) => {
  const authorization = transaction.authorization?.trim() ?? ""

  return `${transaction.phoneNumber}${authorization.padStart(10, "0")}${dateStamp}${String(transaction.soldAmount).padStart(4, "0")}`
}

const isTenDigitValue = (value: string) => /^\d{10}$/.test(value)

const formatDateStamp = (
  date: Date,
  timeZone: string,
  format: ReconciliationFileInput["filenameDateFormat"]
) => {
  if (Number.isNaN(date.getTime())) {
    throw new ReconciliationFileError("Invalid reconciliation date")
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date)
  const byType = new Map(parts.map((part) => [part.type, part.value]))

  if (format === "aaaammdd") {
    return `${byType.get("year")}${byType.get("month")}${byType.get("day")}`
  }

  return `${byType.get("day")}${byType.get("month")}${byType.get("year")}`
}
