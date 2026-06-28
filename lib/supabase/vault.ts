import "server-only"

import { Pool } from "pg"

let pool: Pool | null = null

const getPool = () => {
  const connectionString = process.env.SUPABASE_DB_URL

  if (!connectionString) {
    throw new Error("Missing SUPABASE_DB_URL environment variable.")
  }

  pool ??= new Pool({ connectionString })
  return pool
}

export const readVaultSecret = async (name: string) => {
  const result = await getPool().query<{ decrypted_secret: string }>(
    `select decrypted_secret
     from vault.decrypted_secrets
     where name = $1
     limit 1`,
    [name]
  )

  return result.rows[0]?.decrypted_secret ?? null
}
