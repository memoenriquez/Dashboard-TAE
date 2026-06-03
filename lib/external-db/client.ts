import "server-only"

import sql from "mssql"

import {
  ensureSelectOnlyQuery,
  type BuiltTransactionQuery,
  type QueryParameter,
} from "./transaction-queries"

interface ExternalDbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  encrypt: boolean
}

let poolPromise: Promise<sql.ConnectionPool> | null = null

export const getExternalDbConfig = (): ExternalDbConfig => ({
  host: getRequiredEnv("EXTERNAL_DB_HOST"),
  port: Number(process.env.EXTERNAL_DB_PORT ?? 1433),
  database: getRequiredEnv("EXTERNAL_DB_NAME"),
  user: getRequiredEnv("EXTERNAL_DB_USER"),
  password: getRequiredEnv("EXTERNAL_DB_PASSWORD"),
  encrypt: process.env.EXTERNAL_DB_ENCRYPT !== "false",
})

export const getExternalDbPool = async () => {
  if (!poolPromise) {
    const config = getExternalDbConfig()
    poolPromise = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt,
        trustServerCertificate: true,
      },
      pool: {
        min: 0,
        max: 5,
        idleTimeoutMillis: 30_000,
      },
      requestTimeout: 30_000,
    }).connect()
  }

  return poolPromise
}

export const queryExternalDbRows = async <TRow>(
  query: BuiltTransactionQuery
): Promise<TRow[]> => {
  ensureSelectOnlyQuery(query.sqlText)

  const pool = await getExternalDbPool()
  const request = pool.request()

  query.parameters.forEach((parameter) => {
    request.input(parameter.name, getSqlParameterType(parameter), parameter.value)
  })

  const result = await request.query<TRow>(query.sqlText)
  return result.recordset
}

const getRequiredEnv = (key: string) => {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

const getSqlParameterType = (parameter: QueryParameter) => {
  switch (parameter.type) {
    case "dateTime2":
      return sql.DateTime2
    case "bigInt":
      return sql.BigInt
    case "int":
      return sql.Int
    case "nvarchar":
      return sql.NVarChar
  }
}
