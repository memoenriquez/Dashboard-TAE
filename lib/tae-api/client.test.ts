import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("createTaeApiClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sends ApiKey requests with GET JSON bodies", async () => {
    vi.stubEnv("TAE_API_BASE_URL", "https://api.taectc.mx/api/Info")
    vi.stubEnv("TAE_API_KEY", "secret-key")
    const requestJson = vi.fn().mockResolvedValue({
      success: true,
      message: null,
      data: [{ cuentaID: 8100000099, displayName: "CTC" }],
    })
    const { createTaeApiClient } = await import("./client")

    const client = createTaeApiClient({ requestJson })
    const accounts = await client.getAccountsList({ cuentaID: 0 })

    expect(accounts).toEqual([{ cuentaID: 8100000099, displayName: "CTC" }])
    expect(requestJson).toHaveBeenCalledWith({
      url: "https://api.taectc.mx/api/Info/getAccountsList",
      apiKey: "secret-key",
      body: { cuentaID: 0 },
      timeoutMs: expect.any(Number),
    })
  })

  it("throws a safe provider error when the TAE envelope fails", async () => {
    vi.stubEnv("TAE_API_BASE_URL", "https://api.taectc.mx/api/Info")
    vi.stubEnv("TAE_API_KEY", "secret-key")
    const requestJson = vi.fn().mockResolvedValue({
      success: false,
      message: "ApiKey secret-key rejected",
      data: null,
    })
    const { TaeApiError, createTaeApiClient } = await import("./client")

    const client = createTaeApiClient({ requestJson })

    await expect(client.getBalanceAccount({ cuentaID: 8100000099 })).rejects.toThrow(
      TaeApiError
    )
    await expect(client.getBalanceAccount({ cuentaID: 8100000099 })).rejects.not.toThrow(
      "secret-key"
    )
  })

  it("rejects non-HTTPS base URLs before sending the ApiKey", async () => {
    vi.stubEnv("TAE_API_BASE_URL", "http://api.taectc.mx/api/Info")
    vi.stubEnv("TAE_API_KEY", "secret-key")
    const requestJson = vi.fn()
    const { createTaeApiClient } = await import("./client")

    expect(() => createTaeApiClient({ requestJson })).toThrow(
      "TAE_API_BASE_URL must use HTTPS."
    )
    expect(requestJson).not.toHaveBeenCalled()
  })
})
