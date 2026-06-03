import { createBrowserClient } from "@supabase/ssr"

import { getSupabasePublishableKey, getSupabaseUrl } from "./env-public"

export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey())
