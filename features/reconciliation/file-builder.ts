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
  const dateStamp = formatDateStamp(input.reconciledDate, input.cutoffTimezone)
  const details = input.transactions
    .filter((transaction) => transaction.status === "successful")
    .map((transaction) => formatDetailLine(transaction, dateStamp, input.cutoffTimezone))
  const filename = `${input.reconciliationUsername}_${dateStamp}_TAE_${input.filenameTimeDifference}.txt`
  const lines = [`HDR${dateStamp}`, ...details]

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

const formatDetailLine = (
  transaction: NormalizedTransactionRecord,
  dateStamp: string,
  cutoffTimezone: string
) => {
  if (!isTenDigitValue(transaction.phoneNumber)) {
    throw new ReconciliationFileError(
      `Invalid phone number for transaction ${transaction.ticket}`
    )
  }

  const authorization = transaction.authorization?.trim() ?? ""
  if (!/^\d{1,10}$/.test(authorization)) {
    throw new ReconciliationFileError(
      `Invalid authorization for transaction ${transaction.ticket}`
    )
  }

  if (!Number.isInteger(transaction.soldAmount) || transaction.soldAmount < 0 || transaction.soldAmount > 9999) {
    throw new ReconciliationFileError(`Invalid amount for transaction ${transaction.ticket}`)
  }

  const transactionDateStamp = formatDateStamp(new Date(transaction.occurredAt), cutoffTimezone)
  if (transactionDateStamp !== dateStamp) {
    throw new ReconciliationFileError(
      `Transaction ${transaction.ticket} is outside reconciled date`
    )
  }

  return `${transaction.phoneNumber}${authorization.padStart(10, "0")}${dateStamp}${String(transaction.soldAmount).padStart(4, "0")}`
}

const isTenDigitValue = (value: string) => /^\d{10}$/.test(value)

const formatDateStamp = (date: Date, timeZone: string) => {
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

  return `${byType.get("day")}${byType.get("month")}${byType.get("year")}`
}
