import { describe, expect, it } from "vitest"

import { DashboardValidationError } from "./errors"
import { withApiErrorHandling } from "./route"

describe("withApiErrorHandling", () => {
  it("returns successful handler responses unchanged", async () => {
    const handler = withApiErrorHandling(async () =>
      Response.json({ ok: true }, { status: 201 })
    )

    const response = await handler(new Request("http://localhost/api/test"))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it("maps thrown dashboard errors through the shared API error response", async () => {
    const handler = withApiErrorHandling(async () => {
      throw new DashboardValidationError("Invalid request")
    })

    const response = await handler(new Request("http://localhost/api/test"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Invalid request" })
  })
})
