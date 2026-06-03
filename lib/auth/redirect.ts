const DEFAULT_REDIRECT_PATH = "/dashboard"

export const sanitizeInternalRedirectPath = (
  value: string | null | undefined
): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH
  }

  return value
}
