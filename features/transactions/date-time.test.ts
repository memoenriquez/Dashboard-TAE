import { describe, expect, it } from "vitest"

import { formatExternalDateTime } from "./date-time"

describe("formatExternalDateTime", () => {
  it("formats the external timestamp without converting its timezone", () => {
    expect(formatExternalDateTime("2026-06-03T10:00:00.000-06:00")).toBe(
      "03/06/2026, 10:00:00"
    )
  })
})
