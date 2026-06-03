import { describe, expect, it } from "vitest"

import {
  buildExternalClientsQuery,
  buildTransactionDetailQuery,
  buildTransactionKpisQuery,
  buildTransactionsQuery,
  ensureSelectOnlyQuery,
} from "./transaction-queries"

describe("ensureSelectOnlyQuery", () => {
  it("allows select queries and rejects mutation queries", () => {
    expect(() => ensureSelectOnlyQuery("select * from sales_recargas")).not.toThrow()
    expect(() => ensureSelectOnlyQuery("delete from sales_recargas")).toThrow(
      "External database queries must be read-only SELECT statements"
    )
  })
})

describe("buildTransactionsQuery", () => {
  it("builds a parameterized transaction query with scope and filters", () => {
    const query = buildTransactionsQuery({
      filters: {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-31T23:59:59.999Z"),
        status: "failed",
        phoneNumber: "5512345678",
        operatorName: "Telcel",
        reference: "T-1",
      },
      externalClientIds: [100, 201],
      page: 2,
      pageSize: 25,
    })

    expect(query.sqlText).toContain("sr.cuentaid in (@clientId0, @clientId1)")
    expect(query.sqlText).toContain("sr.codresp <> @successCode")
    expect(query.sqlText).toContain("sr.telefono = @phoneNumber")
    expect(query.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "clientId0", value: 100 }),
        expect.objectContaining({ name: "clientId1", value: 201 }),
        expect.objectContaining({ name: "offset", value: 25 }),
      ])
    )
  })
})

describe("buildTransactionKpisQuery", () => {
  it("builds aggregate KPIs across the filtered result set", () => {
    const query = buildTransactionKpisQuery({
      filters: {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-31T23:59:59.999Z"),
        status: "all",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
      externalClientIds: [100],
    })

    expect(query.sqlText).toContain("count_big(1) as transactionCount")
    expect(query.sqlText).toContain("sum(case when sr.codresp = @successCode")
  })
})

describe("buildTransactionDetailQuery", () => {
  it("builds a ticket lookup constrained by scope", () => {
    const query = buildTransactionDetailQuery({
      ticket: "T-1",
      externalClientIds: [100],
    })

    expect(query.sqlText).toContain("sr.ticket = @ticket")
    expect(query.sqlText).toContain("sr.cuentaid in (@clientId0)")
  })
})

describe("buildExternalClientsQuery", () => {
  it("lists account catalog entries even when they have no transactions", () => {
    const query = buildExternalClientsQuery({
      search: "cliente norte",
      page: 2,
      pageSize: 25,
    })

    expect(query.sqlText).toContain("from cuenta c")
    expect(query.sqlText).toContain("left join sales_recargas sr on sr.cuentaid = c.cuentaid")
    expect(query.sqlText).toContain("group by c.cuentaid")
    expect(query.sqlText).toContain("offset @offset rows")
    expect(query.sqlText).not.toContain("fechahora >=")
    expect(query.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "search", value: "%cliente norte%" }),
        expect.objectContaining({ name: "offset", value: 25 }),
      ])
    )
  })
})
