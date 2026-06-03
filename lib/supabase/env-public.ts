const getRequiredValue = (
  name: string,
  value: string | undefined,
  fallbackName?: string
) => {
  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing ${name} or ${fallbackName} environment variable.`
        : `Missing ${name} environment variable.`
    )
  }

  return value
}

export const getSupabaseUrl = () =>
  getRequiredValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )

export const getSupabasePublishableKey = () =>
  getRequiredValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )
