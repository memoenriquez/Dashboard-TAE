import type { EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { resolveAuthConfirmRedirectPath } from "@/features/auth/confirm"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextPath = resolveAuthConfirmRedirectPath(searchParams.get("next"))
  const redirectTo = request.nextUrl.clone()

  if ((tokenHash && type) || code) {
    const supabase = await createClient()
    const { error } =
      tokenHash && type
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          })
        : await supabase.auth.exchangeCodeForSession(code ?? "")

    if (!error) {
      redirectTo.pathname = nextPath
      redirectTo.search = ""
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = "/login"
  redirectTo.search = ""
  redirectTo.searchParams.set("next", "/dashboard")
  redirectTo.searchParams.set("error", "invalid_link")
  return NextResponse.redirect(redirectTo)
}
