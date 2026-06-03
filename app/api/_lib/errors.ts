import { DashboardAccessDeniedError } from "@/features/auth/errors"

export class DashboardUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "DashboardUnauthorizedError"
  }
}

export const toApiErrorResponse = (error: unknown) => {
  if (error instanceof DashboardUnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (error instanceof DashboardAccessDeniedError) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return Response.json({ error: "Unexpected error" }, { status: 500 })
}
