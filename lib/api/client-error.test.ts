import { describe, expect, it } from "vitest"

import { readApiErrorMessage } from "./client-error"

describe("readApiErrorMessage", () => {
  it("reads the error message from JSON API responses", async () => {
    const response = Response.json(
      { error: "User already registered" },
      { status: 500 }
    )

    await expect(readApiErrorMessage(response, "No fue posible enviar la invitación."))
      .resolves.toBe("User already registered")
  })

  it("falls back when the response body is not JSON", async () => {
    const response = new Response("Internal Server Error", { status: 500 })

    await expect(readApiErrorMessage(response, "No fue posible enviar la invitación."))
      .resolves.toBe("No fue posible enviar la invitación.")
  })
})
