import type { EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { resolveAuthConfirmRedirectPath } from "@/features/auth/confirm"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextPath = resolveAuthConfirmRedirectPath(searchParams.get("next"))
  const redirectTo = request.nextUrl.clone()

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error) {
      redirectTo.pathname = nextPath
      redirectTo.search = ""
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = "/login"
  redirectTo.searchParams.set("next", "/dashboard")
  return NextResponse.redirect(redirectTo)
}
