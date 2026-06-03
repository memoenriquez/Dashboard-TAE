import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export const getCurrentUser = async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}

export const requireCurrentUser = async () => {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}
