import { describe, expect, it } from "vitest"

import { sanitizeInternalRedirectPath } from "./redirect"

describe("sanitizeInternalRedirectPath", () => {
  it("keeps safe internal paths", () => {
    expect(sanitizeInternalRedirectPath("/dashboard/admin/clients")).toBe(
      "/dashboard/admin/clients"
    )
  })

  it("falls back for absolute urls and protocol-relative paths", () => {
    expect(sanitizeInternalRedirectPath("https://example.com")).toBe("/dashboard")
    expect(sanitizeInternalRedirectPath("//example.com/dashboard")).toBe("/dashboard")
  })
})
