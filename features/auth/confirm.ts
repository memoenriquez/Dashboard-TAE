import { sanitizeInternalRedirectPath } from "@/lib/auth/redirect"

export const resolveAuthConfirmRedirectPath = (
  nextPath: string | null | undefined
) => sanitizeInternalRedirectPath(nextPath)
