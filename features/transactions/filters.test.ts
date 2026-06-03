import { describe, expect, it } from "vitest"

import { resolveTransactionFilters } from "./filters"

describe("resolveTransactionFilters", () => {
  it("keeps valid filters within the configured date limit", () => {
    expect(
      resolveTransactionFilters({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
        status: "successful",
        phoneNumber: "5512345678",
        operatorName: "Telcel",
        reference: "T-1",
        maxDays: 90,
      })
    ).toMatchObject({
      status: "successful",
      phoneNumber: "5512345678",
      operatorName: "Telcel",
      reference: "T-1",
    })
  })

  it("rejects date ranges beyond the interactive maximum", () => {
    expect(() =>
      resolveTransactionFilters({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-04-15T00:00:00.000Z",
        maxDays: 90,
      })
    ).toThrow("Transaction date range cannot exceed 90 days")
  })
})
