import { DashboardValidationError } from "./errors"

export const readJsonObject = async (
  request: Request
): Promise<Record<string, unknown>> => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new DashboardValidationError("Request body must be valid JSON")
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DashboardValidationError("Request body must be a JSON object")
  }

  return body as Record<string, unknown>
}
