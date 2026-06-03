import { describe, expect, it } from "vitest"

import { resolveAuthConfirmRedirectPath } from "./confirm"

describe("resolveAuthConfirmRedirectPath", () => {
  it("allows internal confirmation redirect paths", () => {
    expect(resolveAuthConfirmRedirectPath("/auth/accept-invite")).toBe(
      "/auth/accept-invite"
    )
  })

  it("falls back to the dashboard for external redirect paths", () => {
    expect(resolveAuthConfirmRedirectPath("https://evil.example.com")).toBe(
      "/dashboard"
    )
  })
})
