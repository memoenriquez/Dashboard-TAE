import { describe, expect, it } from "vitest"

import { getSupabaseAuthErrorMessage } from "./auth-error-message"

describe("getSupabaseAuthErrorMessage", () => {
  it("translates invalid credentials into a safe Spanish message", () => {
    expect(
      getSupabaseAuthErrorMessage(
        { code: "invalid_credentials", message: "Invalid login credentials" },
        "No se pudo iniciar sesión."
      )
    ).toBe("El correo o la contraseña no son correctos.")
  })

  it("falls back to the provided message for unknown Supabase errors", () => {
    expect(
      getSupabaseAuthErrorMessage(
        { message: "some provider-specific error" },
        "No fue posible completar la operación."
      )
    ).toBe("No fue posible completar la operación.")
  })
})
