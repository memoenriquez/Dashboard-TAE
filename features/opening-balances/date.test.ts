import { describe, expect, it } from "vitest"

import { getBusinessDate } from "./date"

describe("getBusinessDate", () => {
  it("uses Mexico City date when UTC is already the next day", () => {
    expect(
      getBusinessDate({ now: new Date("2026-07-02T05:30:00.000Z") })
    ).toBe("2026-07-01")
  })
})
