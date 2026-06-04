import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { createClientMock, exchangeCodeForSessionMock, verifyOtpMock } = vi.hoisted(
  () => ({
    createClientMock: vi.fn(),
    exchangeCodeForSessionMock: vi.fn(),
    verifyOtpMock: vi.fn(),
  })
)

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

import { GET } from "./route"

const createRequest = (url: string) => new NextRequest(url)

const setupSupabaseClient = () => {
  createClientMock.mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      verifyOtp: verifyOtpMock,
    },
  })
}

describe("GET /auth/confirm", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("verifies token hash links and redirects to the requested internal path", async () => {
    setupSupabaseClient()
    verifyOtpMock.mockResolvedValue({ error: null })

    const response = await GET(
      createRequest(
        "https://dashboard.example.com/auth/confirm?token_hash=hash&type=recovery&next=%2Fauth%2Freset-password"
      )
    )

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "hash",
      type: "recovery",
    })
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://dashboard.example.com/auth/reset-password"
    )
  })

  it("exchanges PKCE code links and redirects to the requested internal path", async () => {
    setupSupabaseClient()
    exchangeCodeForSessionMock.mockResolvedValue({ error: null })

    const response = await GET(
      createRequest(
        "https://dashboard.example.com/auth/confirm?code=auth-code&next=%2Fauth%2Freset-password"
      )
    )

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("auth-code")
    expect(verifyOtpMock).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://dashboard.example.com/auth/reset-password"
    )
  })

  it("falls back to the dashboard when a PKCE code link includes an external next path", async () => {
    setupSupabaseClient()
    exchangeCodeForSessionMock.mockResolvedValue({ error: null })

    const response = await GET(
      createRequest(
        "https://dashboard.example.com/auth/confirm?code=auth-code&next=https%3A%2F%2Fevil.example.com"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://dashboard.example.com/dashboard"
    )
  })

  it("redirects invalid links to login with an error", async () => {
    setupSupabaseClient()
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: "invalid code" },
    })

    const response = await GET(
      createRequest(
        "https://dashboard.example.com/auth/confirm?code=expired-code&next=%2Fauth%2Freset-password"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://dashboard.example.com/login?next=%2Fdashboard&error=invalid_link"
    )
  })
})
