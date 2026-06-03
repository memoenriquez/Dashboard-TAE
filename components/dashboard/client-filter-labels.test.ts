import { describe, expect, it } from "vitest"

import { getSelectedClientFilterLabel } from "./client-filter-labels"

const clients = [
  {
    externalClientId: 9900001003,
    displayName: "QA Asociado 1624",
  },
]

describe("client filter labels", () => {
  it("shows Todos for the all-client filter value", () => {
    expect(getSelectedClientFilterLabel(clients, "all")).toBe("Todos")
  })

  it("uses the human display name for the selected external client id", () => {
    expect(getSelectedClientFilterLabel(clients, "9900001003")).toBe(
      "QA Asociado 1624"
    )
  })

  it("falls back to the selected value when the option is not available", () => {
    expect(getSelectedClientFilterLabel(clients, "123")).toBe("123")
  })
})
