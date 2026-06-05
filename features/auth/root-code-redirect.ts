const PASSWORD_RESET_PATH = "/auth/reset-password"

export interface RootAuthCodeSearchParams {
  code?: string | string[]
}

export const buildRootAuthCodeRedirectPath = ({
  code,
}: RootAuthCodeSearchParams) => {
  const authCode = Array.isArray(code) ? code[0] : code

  if (!authCode) {
    return null
  }

  const redirectUrl = new URL("http://dashboard.local/auth/confirm")
  redirectUrl.searchParams.set("code", authCode)
  redirectUrl.searchParams.set("next", PASSWORD_RESET_PATH)

  return `${redirectUrl.pathname}${redirectUrl.search}`
}
