import type { TransactionFilters } from "@/features/transactions/types"

export interface QueryParameter {
  name: string
  type: "dateTime2" | "bigInt" | "nvarchar" | "int"
  value: Date | number | string
}

export interface BuiltTransactionQuery {
  sqlText: string
  parameters: QueryParameter[]
}

export interface BuildTransactionsQueryInput {
  filters: TransactionFilters
  externalClientIds: number[]
  page: number
  pageSize: number
}

export interface BuildTransactionScopedQueryInput {
  filters: TransactionFilters
  externalClientIds: number[]
}

export interface BuildTransactionDetailQueryInput {
  ticket: string
  externalClientIds: number[]
}

export interface BuildExternalClientsQueryInput {
  search: string | null
  page: number
  pageSize: number
}

export const ensureSelectOnlyQuery = (sqlText: string) => {
  const normalizedSql = sqlText.trim().toLowerCase()

  if (!normalizedSql.startsWith("select")) {
    throw new Error("External database queries must be read-only SELECT statements")
  }

  if (
    /\b(insert|update|delete|merge|drop|alter|truncate|create|exec|execute)\b/.test(
      normalizedSql
    )
  ) {
    throw new Error("External database queries must be read-only SELECT statements")
  }
}

export const buildTransactionsQuery = (
  input: BuildTransactionsQueryInput
): BuiltTransactionQuery => {
  const parameters: QueryParameter[] = [
    { name: "from", type: "dateTime2", value: input.filters.from },
    { name: "to", type: "dateTime2", value: input.filters.to },
    { name: "offset", type: "int", value: Math.max(input.page - 1, 0) * input.pageSize },
    { name: "pageSize", type: "int", value: input.pageSize },
  ]
  const whereClauses = ["sr.fechahora >= @from", "sr.fechahora <= @to"]

  if (input.externalClientIds.length > 0) {
    const clientParameterNames = input.externalClientIds.map(
      (externalClientId, index) => {
        const parameterName = `clientId${index}`
        parameters.push({
          name: parameterName,
          type: "bigInt",
          value: externalClientId,
        })
        return `@${parameterName}`
      }
    )

    whereClauses.push(`sr.cuentaid in (${clientParameterNames.join(", ")})`)
  }

  if (input.filters.status === "successful") {
    parameters.push({ name: "successCode", type: "nvarchar", value: "0" })
    whereClauses.push("sr.codresp = @successCode")
  }

  if (input.filters.status === "failed") {
    parameters.push({ name: "successCode", type: "nvarchar", value: "0" })
    whereClauses.push("sr.codresp <> @successCode")
  }

  if (input.filters.phoneNumber) {
    parameters.push({ name: "phoneNumber", type: "nvarchar", value: input.filters.phoneNumber })
    whereClauses.push("sr.telefono = @phoneNumber")
  }

  if (input.filters.reference) {
    parameters.push({ name: "reference", type: "nvarchar", value: input.filters.reference })
    whereClauses.push(
      "(sr.ticket = @reference or sr.tokentransid = @reference or sr.trequestid = @reference)"
    )
  }

  const sqlText = `
select
  sr.ticket,
  sr.cuentaid,
  sr.fechahora,
  sr.telefono,
  sr.SKU,
  si.Nombre as productName,
  sr.monto,
  sr.codresp,
  sr.descrip,
  sr.mensajenativo,
  sr.tokentransid,
  sr.trequestid,
  c.nombrenegocio,
  c.razonsocial
from sales_recargas sr
left join cuenta c on c.cuentaid = sr.cuentaid
left join sku_items si on si.SKU = sr.SKU
where ${whereClauses.join("\n  and ")}
order by sr.fechahora desc
offset @offset rows
fetch next @pageSize rows only
`.trim()

  ensureSelectOnlyQuery(sqlText)

  return {
    sqlText,
    parameters,
  }
}

export const buildTransactionKpisQuery = (
  input: BuildTransactionScopedQueryInput
): BuiltTransactionQuery => {
  const { whereClauses, parameters } = buildFilteredWhere(input)
  addSuccessCodeParameter(parameters)

  const sqlText = `
select
  count_big(1) as transactionCount,
  coalesce(sum(case when sr.codresp = @successCode then sr.monto else 0 end), 0) as soldAmount
from sales_recargas sr
where ${whereClauses.join("\n  and ")}
`.trim()

  ensureSelectOnlyQuery(sqlText)

  return {
    sqlText,
    parameters,
  }
}

export const buildTransactionDetailQuery = (
  input: BuildTransactionDetailQueryInput
): BuiltTransactionQuery => {
  const parameters: QueryParameter[] = [
    { name: "ticket", type: "nvarchar", value: input.ticket },
  ]
  const whereClauses = ["sr.ticket = @ticket"]
  addScopeWhere(whereClauses, parameters, input.externalClientIds)

  const sqlText = `
select top 1
  sr.ticket,
  sr.cuentaid,
  sr.fechahora,
  sr.telefono,
  sr.SKU,
  si.Nombre as productName,
  sr.monto,
  sr.codresp,
  sr.descrip,
  sr.mensajenativo,
  sr.tokentransid,
  sr.trequestid,
  c.nombrenegocio,
  c.razonsocial
from sales_recargas sr
left join cuenta c on c.cuentaid = sr.cuentaid
left join sku_items si on si.SKU = sr.SKU
where ${whereClauses.join("\n  and ")}
order by sr.fechahora desc
`.trim()

  ensureSelectOnlyQuery(sqlText)

  return {
    sqlText,
    parameters,
  }
}

export const buildExternalClientsQuery = (
  input: BuildExternalClientsQueryInput
): BuiltTransactionQuery => {
  const parameters: QueryParameter[] = [
    { name: "offset", type: "int", value: Math.max(input.page - 1, 0) * input.pageSize },
    { name: "pageSize", type: "int", value: input.pageSize },
  ]
  const whereClauses: string[] = []
  const trimmedSearch = input.search?.trim()

  if (trimmedSearch) {
    parameters.push({ name: "search", type: "nvarchar", value: `%${trimmedSearch}%` })
    whereClauses.push(
      "(cast(c.cuentaid as nvarchar(50)) like @search or c.nombrenegocio like @search or c.razonsocial like @search)"
    )
  }

  const sqlText = `
select
  c.cuentaid,
  coalesce(nullif(ltrim(rtrim(c.nombrenegocio)), ''), nullif(ltrim(rtrim(c.razonsocial)), '')) as displayName,
  count_big(sr.ticket) as transactionCount,
  max(sr.fechahora) as lastTransactionAt
from cuenta c
left join sales_recargas sr on sr.cuentaid = c.cuentaid
${whereClauses.length > 0 ? `where ${whereClauses.join("\n  and ")}` : ""}
group by c.cuentaid, c.nombrenegocio, c.razonsocial
order by displayName asc, c.cuentaid asc
offset @offset rows
fetch next @pageSize rows only
`.trim()

  ensureSelectOnlyQuery(sqlText)

  return {
    sqlText,
    parameters,
  }
}

const buildFilteredWhere = (input: BuildTransactionScopedQueryInput) => {
  const parameters: QueryParameter[] = [
    { name: "from", type: "dateTime2", value: input.filters.from },
    { name: "to", type: "dateTime2", value: input.filters.to },
  ]
  const whereClauses = ["sr.fechahora >= @from", "sr.fechahora <= @to"]

  addScopeWhere(whereClauses, parameters, input.externalClientIds)

  if (input.filters.status === "successful") {
    addSuccessCodeParameter(parameters)
    whereClauses.push("sr.codresp = @successCode")
  }

  if (input.filters.status === "failed") {
    addSuccessCodeParameter(parameters)
    whereClauses.push("sr.codresp <> @successCode")
  }

  if (input.filters.phoneNumber) {
    parameters.push({ name: "phoneNumber", type: "nvarchar", value: input.filters.phoneNumber })
    whereClauses.push("sr.telefono = @phoneNumber")
  }

  if (input.filters.reference) {
    parameters.push({ name: "reference", type: "nvarchar", value: input.filters.reference })
    whereClauses.push(
      "(sr.ticket = @reference or sr.tokentransid = @reference or sr.trequestid = @reference)"
    )
  }

  return {
    whereClauses,
    parameters,
  }
}

const addSuccessCodeParameter = (parameters: QueryParameter[]) => {
  if (parameters.some((parameter) => parameter.name === "successCode")) {
    return
  }

  parameters.push({ name: "successCode", type: "nvarchar", value: "0" })
}

const addScopeWhere = (
  whereClauses: string[],
  parameters: QueryParameter[],
  externalClientIds: number[]
) => {
  if (externalClientIds.length === 0) {
    return
  }

  const clientParameterNames = externalClientIds.map((externalClientId, index) => {
    const parameterName = `clientId${index}`
    parameters.push({
      name: parameterName,
      type: "bigInt",
      value: externalClientId,
    })
    return `@${parameterName}`
  })

  whereClauses.push(`sr.cuentaid in (${clientParameterNames.join(", ")})`)
}
