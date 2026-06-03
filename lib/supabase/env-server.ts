import "server-only"

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

export const getSupabaseSecretKey = () =>
  getRequiredValue(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY"
  )
