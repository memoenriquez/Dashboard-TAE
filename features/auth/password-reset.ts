const PASSWORD_RESET_PATH = "/auth/reset-password"

export const buildPasswordResetRedirectUrl = (origin: string) => {
  const redirectUrl = new URL("/auth/confirm", origin)
  redirectUrl.searchParams.set("next", PASSWORD_RESET_PATH)

  return redirectUrl.toString()
}
