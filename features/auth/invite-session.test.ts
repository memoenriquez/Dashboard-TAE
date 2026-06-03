import { describe, expect, it } from "vitest"

import { getInviteSessionFromHash } from "./invite-session"

describe("getInviteSessionFromHash", () => {
  it("extracts access and refresh tokens from Supabase invite hash", () => {
    expect(
      getInviteSessionFromHash(
        "#access_token=access-token&refresh_token=refresh-token&type=invite"
      )
    ).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })
  })

  it("returns null when the hash does not contain both tokens", () => {
    expect(getInviteSessionFromHash("#type=invite")).toBeNull()
  })
})
