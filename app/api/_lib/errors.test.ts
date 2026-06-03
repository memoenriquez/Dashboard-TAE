import { describe, expect, it } from "vitest"

import { DashboardAccessDeniedError } from "@/features/auth/errors"

import { DashboardUnauthorizedError, toApiErrorResponse } from "./errors"

describe("toApiErrorResponse", () => {
  it("returns 401 for unauthenticated dashboard requests", async () => {
    const response = toApiErrorResponse(new DashboardUnauthorizedError())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns 403 for authenticated users without dashboard access", async () => {
    const response = toApiErrorResponse(new DashboardAccessDeniedError())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
  })

  it("does not expose internal error messages for unexpected errors", async () => {
    const response = toApiErrorResponse(new Error("database password leaked in stack"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Unexpected error" })
  })
})
