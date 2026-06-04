import { describe, expect, it } from "vitest"

import { DashboardValidationError } from "./errors"
import { readJsonObject } from "./request-body"

describe("readJsonObject", () => {
  it("returns JSON objects from request bodies", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ id: "123" }),
    })

    await expect(readJsonObject(request)).resolves.toEqual({ id: "123" })
  })

  it("rejects non-object JSON bodies", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify(["not", "an", "object"]),
    })

    await expect(readJsonObject(request)).rejects.toThrow(DashboardValidationError)
  })

  it("rejects malformed JSON bodies as validation errors", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{not-json",
    })

    await expect(readJsonObject(request)).rejects.toThrow(DashboardValidationError)
  })
})
