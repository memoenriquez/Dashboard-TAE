import { describe, expect, it } from "vitest"

import { getResponseCodeCatalogEntry } from "./response-code-catalog"

describe("getResponseCodeCatalogEntry", () => {
  it("returns documented diagnostic context for known API response codes", () => {
    expect(getResponseCodeCatalogEntry("0")).toEqual({
      code: "0",
      label: "Éxito",
      description: "La operación fue aceptada como exitosa por el servicio TAE.",
      severity: "success",
    })

    expect(getResponseCodeCatalogEntry("3")).toMatchObject({
      label: "Fracaso",
      severity: "error",
    })
  })

  it("returns a safe fallback for unmapped persisted database codes", () => {
    expect(getResponseCodeCatalogEntry("99")).toEqual({
      code: "99",
      label: "Código no catalogado",
      description:
        "El sistema devolvió un código que no está descrito en el catálogo documentado.",
      severity: "unknown",
    })
  })
})
