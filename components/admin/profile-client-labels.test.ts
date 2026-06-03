import { describe, expect, it } from "vitest"

import {
  formatClientIdFallback,
  getClientLabel,
  getClientLabelText,
} from "./profile-client-labels"

const activeClient = {
  id: "c555c394-1234-4567-8901-abcdefabcdef",
  externalClientId: null,
  displayName: "QA Principal Contenedor 1624",
  clientKind: "parent" as const,
  isActive: true,
}

describe("profile client labels", () => {
  it("uses the human client name and Sin cuentaID for container parents", () => {
    expect(getClientLabelText(activeClient)).toBe(
      "QA Principal Contenedor 1624 · Sin cuentaID"
    )
  })

  it("uses a short fallback when the selected client is no longer available", () => {
    expect(getClientLabel([], activeClient.id)).toBe("Cliente no encontrado · c555c394...")
  })

  it("never returns a full UUID fallback by default", () => {
    expect(formatClientIdFallback(activeClient.id)).not.toContain(activeClient.id)
  })
})
