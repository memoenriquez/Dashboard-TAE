import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getSupabaseUrl } from "./env-public"
import { getSupabaseSecretKey } from "./env-server"

export const createAdminClient = () =>
  createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
