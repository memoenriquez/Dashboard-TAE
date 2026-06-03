import { describe, expect, it } from "vitest"

import { mapExternalClientCatalogRow } from "./external-clients"

describe("mapExternalClientCatalogRow", () => {
  it("normalizes an external client account with no transactions", () => {
    expect(
      mapExternalClientCatalogRow({
        cuentaid: "123",
        displayName: null,
        transactionCount: null,
        lastTransactionAt: null,
      })
    ).toEqual({
      externalClientId: 123,
      displayName: "Cliente 123",
      transactionCount: 0,
      lastTransactionAt: null,
    })
  })
})
