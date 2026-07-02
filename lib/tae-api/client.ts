import "server-only"

import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"

import type {
  TaeAccount,
  TaeApiClient,
  TaeApiEnvelope,
  TaeBalance,
  TaeGetAccountsListInput,
  TaeGetBalanceAccountInput,
  TaeGetTransactionsListInput,
  TaeTransaction,
} from "./types"

export class TaeApiError extends Error {
  constructor(message = "TAE API request failed") {
    super(message)
    this.name = "TaeApiError"
  }
}

interface RequestJsonInput {
  url: string
  apiKey: string
  body: unknown
  timeoutMs: number
}

export interface CreateTaeApiClientInput {
  requestJson?: (input: RequestJsonInput) => Promise<unknown>
}

export const createTaeApiClient = (
  input: CreateTaeApiClientInput = {}
): TaeApiClient => {
  const baseUrl = getRequiredHttpsBaseUrl("TAE_API_BASE_URL")
  const apiKey = getRequiredEnv("TAE_API_KEY")
  const timeoutMs = getPositiveIntegerEnv("TAE_API_TIMEOUT_MS", 25_000)
  const requestJson = input.requestJson ?? requestJsonWithGetBody

  return {
    getAccountsList: (body) =>
      requestTae<TaeAccount[]>({
        requestJson,
        url: `${baseUrl}/getAccountsList`,
        apiKey,
        timeoutMs,
        body,
      }),
    getTransactionsList: (body) =>
      requestTae<TaeTransaction[]>({
        requestJson,
        url: `${baseUrl}/getTransactionsList`,
        apiKey,
        timeoutMs,
        body,
      }),
    getBalanceAccount: (body) =>
      requestTae<TaeBalance>({
        requestJson,
        url: `${baseUrl}/getBalanceAccount`,
        apiKey,
        timeoutMs,
        body,
      }),
  }
}

const requestTae = async <TData>(input: {
  requestJson: (request: RequestJsonInput) => Promise<unknown>
  url: string
  apiKey: string
  timeoutMs: number
  body:
    | TaeGetAccountsListInput
    | TaeGetTransactionsListInput
    | TaeGetBalanceAccountInput
}): Promise<TData> => {
  const envelope = (await input.requestJson({
    url: input.url,
    apiKey: input.apiKey,
    body: input.body,
    timeoutMs: input.timeoutMs,
  })) as Partial<TaeApiEnvelope<TData>>

  if (!envelope.success) {
    throw new TaeApiError(sanitizeProviderMessage(envelope.message, input.apiKey))
  }

  return envelope.data as TData
}

const requestJsonWithGetBody = (input: RequestJsonInput) =>
  new Promise<unknown>((resolve, reject) => {
    const url = new URL(input.url)
    const payload = JSON.stringify(input.body)
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest
    const request = transport(
      url,
      {
        method: "GET",
        headers: {
          ApiKey: input.apiKey,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: input.timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk)
        })
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new TaeApiError(`TAE API returned HTTP ${response.statusCode ?? "unknown"}`))
            return
          }

          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")))
          } catch {
            reject(new TaeApiError("Invalid TAE API response"))
          }
        })
      }
    )

    request.on("timeout", () => {
      request.destroy(new TaeApiError("TAE API request timed out"))
    })
    request.on("error", (error) => {
      reject(new TaeApiError(`TAE API request failed: ${error.message}`))
    })
    request.write(payload)
    request.end()
  })

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`)
  }

  return value
}

const sanitizeProviderMessage = (message: string | null | undefined, apiKey: string) => {
  if (!message) {
    return "TAE API request failed"
  }

  return message.replaceAll(apiKey, "[REDACTED]")
}

const getRequiredHttpsBaseUrl = (name: string) => {
  const value = getRequiredEnv(name).replace(/\/+$/, "")
  const url = new URL(value)

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`)
  }

  return value
}

const getPositiveIntegerEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback)

  if (!Number.isInteger(value) || value < 1) {
    return fallback
  }

  return value
}
