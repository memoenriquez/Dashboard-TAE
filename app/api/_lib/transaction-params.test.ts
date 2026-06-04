import { describe, expect, it } from "vitest"

import { DashboardValidationError } from "./errors"
import { parseTransactionSearchParams } from "./transaction-params"

describe("parseTransactionSearchParams", () => {
  it("accepts known transaction statuses", () => {
    const filters = parseTransactionSearchParams(
      new URLSearchParams({
        from: "2026-05-23",
        to: "2026-05-30",
        status: "failed",
      })
    )

    expect(filters.status).toBe("failed")
  })

  it("rejects unknown transaction statuses instead of silently querying all", () => {
    expect(() =>
      parseTransactionSearchParams(
        new URLSearchParams({
          from: "2026-05-23",
          to: "2026-05-30",
          status: "error",
        })
      )
    ).toThrow(DashboardValidationError)
  })

  it("parses a requested external client id filter", () => {
    const filters = parseTransactionSearchParams(
      new URLSearchParams({
        from: "2026-05-23",
        to: "2026-05-30",
        externalClientId: "201",
      })
    )

    expect(filters.externalClientId).toBe(201)
  })

  it("rejects invalid external client id filters", () => {
    expect(() =>
      parseTransactionSearchParams(
        new URLSearchParams({
          from: "2026-05-23",
          to: "2026-05-30",
          externalClientId: "abc",
        })
      )
    ).toThrow(DashboardValidationError)
  })
})
