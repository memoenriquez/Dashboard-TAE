import { describe, expect, it } from "vitest"

import {
  buildBalanceQueryUrl,
  getBalanceQueryExternalClientId,
  shouldShowClientFilter,
} from "./balance-query"
import type { DashboardClientContext, DashboardClientOption } from "./types"

const clients: DashboardClientOption[] = [
  {
    id: "client-1",
    externalClientId: 1001,
    displayName: "Cliente 1001",
    clientKind: "child",
  },
  {
    id: "client-2",
    externalClientId: 1002,
    displayName: "Cliente 1002",
    clientKind: "child",
  },
]
const standaloneClient: DashboardClientContext = {
  id: "standalone-client",
  externalClientId: 1001,
  displayName: "Cliente 1001",
  clientKind: "standalone",
}
const parentClient: DashboardClientContext = {
  id: "parent-client",
  externalClientId: null,
  displayName: "Padre",
  clientKind: "parent",
}

describe("balance query helpers", () => {
  it("uses the applied client filter when a specific account is selected", () => {
    expect(getBalanceQueryExternalClientId("1002", clients, parentClient)).toBe("1002")
  })

  it("uses the only available account for a standalone account view", () => {
    expect(getBalanceQueryExternalClientId("all", [clients[0]], standaloneClient)).toBe(
      "1001"
    )
  })

  it("does not auto-select the only account for parent consolidated views", () => {
    expect(getBalanceQueryExternalClientId("all", [clients[0]], parentClient)).toBeNull()
  })

  it("requires a specific account for multi-account consolidated views", () => {
    expect(getBalanceQueryExternalClientId("all", clients, parentClient)).toBeNull()
  })

  it("builds the balance endpoint URL with the selected account", () => {
    expect(buildBalanceQueryUrl("1001")).toBe(
      "/api/accounts/balance?externalClientId=1001"
    )
  })

  it("shows the client filter for parent views even with one available account", () => {
    expect(shouldShowClientFilter([clients[0]], parentClient)).toBe(true)
  })

  it("hides the client filter for direct account views with one available account", () => {
    expect(shouldShowClientFilter([clients[0]], standaloneClient)).toBe(false)
  })
})
