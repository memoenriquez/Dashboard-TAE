export interface ExternalClientCatalogEntry {
  externalClientId: number
  displayName: string
  transactionCount: number
  lastTransactionAt: string | null
}

export interface ExternalClientCatalogRow {
  cuentaid: string | number
  displayName: string | null
  transactionCount: string | number | bigint | null
  lastTransactionAt: string | Date | null
}

export const mapExternalClientCatalogRow = (
  row: ExternalClientCatalogRow
): ExternalClientCatalogEntry => {
  const externalClientId = Number(row.cuentaid)
  const displayName = row.displayName?.trim() || `Cliente ${externalClientId}`

  return {
    externalClientId,
    displayName,
    transactionCount: Number(row.transactionCount ?? 0),
    lastTransactionAt: row.lastTransactionAt
      ? new Date(row.lastTransactionAt).toISOString()
      : null,
  }
}
