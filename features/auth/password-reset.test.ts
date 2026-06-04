import { describe, expect, it } from "vitest"

import { buildPasswordResetRedirectUrl } from "./password-reset"

describe("buildPasswordResetRedirectUrl", () => {
  it("builds a Supabase email redirect through the auth confirmation route", () => {
    expect(buildPasswordResetRedirectUrl("https://dashboard.example.com")).toBe(
      "https://dashboard.example.com/auth/confirm?next=%2Fauth%2Freset-password"
    )
  })
})
