import { DashboardAccessDeniedError } from "@/features/auth/errors"
import {
  DashboardInvitationAuthError,
  DashboardInvitationValidationError,
} from "@/features/auth/invitations"
import { AdminValidationError } from "@/features/clients/admin-validation"
import { ReconciliationGenerationError } from "@/features/reconciliation/errors"
import { ReconciliationValidationError } from "@/features/reconciliation/validation"

export class DashboardUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "DashboardUnauthorizedError"
  }
}

export class DashboardValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DashboardValidationError"
  }
}

export const toApiErrorResponse = (error: unknown) => {
  if (error instanceof DashboardUnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (error instanceof DashboardAccessDeniedError) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  if (error instanceof DashboardValidationError) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  if (
    error instanceof AdminValidationError ||
    error instanceof DashboardInvitationValidationError ||
    error instanceof ReconciliationGenerationError ||
    error instanceof ReconciliationValidationError
  ) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof DashboardInvitationAuthError) {
    return Response.json({ error: error.message }, { status: 502 })
  }

  return Response.json({ error: "Unexpected error" }, { status: 500 })
}
