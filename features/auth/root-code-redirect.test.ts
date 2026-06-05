import { describe, expect, it } from "vitest"

import { buildRootAuthCodeRedirectPath } from "./root-code-redirect"

describe("buildRootAuthCodeRedirectPath", () => {
  it("routes auth codes received at the site root through the confirmation callback", () => {
    expect(
      buildRootAuthCodeRedirectPath({
        code: "c20ab3c2-388a-435a-a461-94b66d0d1c5a",
      })
    ).toBe(
      "/auth/confirm?code=c20ab3c2-388a-435a-a461-94b66d0d1c5a&next=%2Fauth%2Freset-password"
    )
  })

  it("ignores root visits without an auth code", () => {
    expect(buildRootAuthCodeRedirectPath({})).toBeNull()
  })
})
