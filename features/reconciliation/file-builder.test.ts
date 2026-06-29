import { describe, expect, it } from "vitest"

import type { NormalizedTransactionRecord } from "@/features/transactions/types"

import { createReconciliationFile, ReconciliationFileError } from "./file-builder"

const baseTransaction: NormalizedTransactionRecord = {
  ticket: "ticket-1",
  externalClientId: 123,
  visibleClientName: "Cliente",
  occurredAt: "2026-02-26T18:30:00.000Z",
  status: "successful",
  phoneNumber: "6563739932",
  operatorName: "Telcel",
  sku: "TEL20",
  productName: "Telcel 20",
  soldAmount: 20,
  responseCode: "0",
  responseMessage: null,
  apiReference: "api-1",
  authorization: "104548",
}

describe("createReconciliationFile", () => {
  it("creates a CRLF-delimited Telcel reconciliation file", () => {
    const file = createReconciliationFile({
      reconciliationUsername: "M3CORP01",
      filenameTimeDifference: "0",
      filenameDateFormat: "ddmmaaaa",
      contentDateFormat: "ddmmaaaa",
      reconciledDate: new Date("2026-02-26T12:00:00.000Z"),
      cutoffTimezone: "America/Chihuahua",
      transactions: [
        baseTransaction,
        {
          ...baseTransaction,
          ticket: "ticket-2",
          status: "failed",
          soldAmount: 500,
          responseCode: "3",
        },
      ],
    })

    expect(file).toEqual({
      filename: "M3CORP01_26022026_TAE_0.txt",
      content: "HDR26022026\r\n65637399320000104548260220260020\r\n",
      transactionCount: 1,
      totalAmount: 20,
    })
  })

  it("formats filename and content dates independently", () => {
    const file = createReconciliationFile({
      reconciliationUsername: "M3CORP01",
      filenameTimeDifference: "0",
      filenameDateFormat: "aaaammdd",
      contentDateFormat: "ddmmaaaa",
      reconciledDate: new Date("2026-02-26T12:00:00.000Z"),
      cutoffTimezone: "America/Chihuahua",
      transactions: [baseTransaction],
    })

    expect(file.filename).toBe("M3CORP01_20260226_TAE_0.txt")
    expect(file.content).toBe("HDR26022026\r\n65637399320000104548260220260020\r\n")
  })

  it("creates a header-only file when there are no successful transactions", () => {
    const file = createReconciliationFile({
      reconciliationUsername: "CTC001",
      filenameTimeDifference: "-1",
      filenameDateFormat: "ddmmaaaa",
      contentDateFormat: "ddmmaaaa",
      reconciledDate: new Date("2026-02-26T12:00:00.000Z"),
      cutoffTimezone: "America/Mexico_City",
      transactions: [{ ...baseTransaction, status: "failed", responseCode: "3" }],
    })

    expect(file.content).toBe("HDR26022026\r\n")
    expect(file.transactionCount).toBe(0)
    expect(file.totalAmount).toBe(0)
  })

  it("rejects successful transactions with invalid required fields", () => {
    expect(() =>
      createReconciliationFile({
        reconciliationUsername: "M3CORP01",
        filenameTimeDifference: "0",
        filenameDateFormat: "ddmmaaaa",
        contentDateFormat: "ddmmaaaa",
        reconciledDate: new Date("2026-02-26T12:00:00.000Z"),
        cutoffTimezone: "America/Chihuahua",
        transactions: [{ ...baseTransaction, authorization: null }],
      })
    ).toThrow("Invalid reconciliation data (1): Invalid authorization for transaction ticket-1")
  })

  it("rejects successful transactions outside the reconciled date", () => {
    expect(() =>
      createReconciliationFile({
        reconciliationUsername: "M3CORP01",
        filenameTimeDifference: "0",
        filenameDateFormat: "ddmmaaaa",
        contentDateFormat: "ddmmaaaa",
        reconciledDate: new Date("2026-02-26T12:00:00.000Z"),
        cutoffTimezone: "America/Chihuahua",
        transactions: [
          { ...baseTransaction, occurredAt: "2026-02-27T07:00:00.000Z" },
        ],
      })
    ).toThrow(ReconciliationFileError)
  })
})
