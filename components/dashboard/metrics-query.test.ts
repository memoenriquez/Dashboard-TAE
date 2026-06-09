import { describe, expect, it } from "vitest"

import { buildMetricsQueryUrl, shouldShowClientRanking } from "./metrics-query"
import type { DashboardClientOption } from "./types"

const clients: DashboardClientOption[] = [
  {
    id: "client-1",
    externalClientId: 1001,
    displayName: "Cliente 1001",
    clientKind: "parent",
  },
  {
    id: "client-2",
    externalClientId: 1002,
    displayName: "Cliente 1002",
    clientKind: "child",
  },
]

describe("metrics query helpers", () => {
  it("builds the metrics endpoint URL from applied transaction filters", () => {
    expect(
      buildMetricsQueryUrl({
        from: "2026-01-01",
        to: "2026-01-31",
        status: "successful",
        phoneNumber: "5512345678",
        reference: "ticket-1",
        externalClientId: "1001",
      })
    ).toBe(
      "/api/transactions/metrics?from=2026-01-01&to=2026-01-31&status=successful&phoneNumber=5512345678&reference=ticket-1&externalClientId=1001"
    )
  })

  it("omits optional metrics query parameters when filters are empty or consolidated", () => {
    expect(
      buildMetricsQueryUrl({
        from: "2026-01-01",
        to: "2026-01-31",
        status: "all",
        phoneNumber: "",
        reference: "",
        externalClientId: "all",
      })
    ).toBe("/api/transactions/metrics?from=2026-01-01&to=2026-01-31&status=all")
  })

  it("shows the client ranking only for multi-client metric views", () => {
    expect(shouldShowClientRanking(clients)).toBe(true)
    expect(shouldShowClientRanking([clients[0]])).toBe(false)
  })
})
