import type { ExternalTransactionRow, NormalizedTransactionRecord } from "./types"

export const normalizeTransactionRow = (
  row: ExternalTransactionRow
): NormalizedTransactionRecord => {
  return {
    ticket: String(row.ticket),
    externalClientId: Number(row.cuentaid),
    visibleClientName: firstNonEmpty(row.nombrenegocio, row.razonsocial) ?? "Cliente sin nombre",
    occurredAt: toIsoString(row.fechahora),
    status: String(row.codresp) === "0" ? "successful" : "failed",
    phoneNumber: String(row.telefono),
    operatorName: "Telcel",
    sku: String(row.SKU),
    productName: firstNonEmpty(row.productName),
    soldAmount: Number(row.monto),
    responseCode: String(row.codresp),
    responseMessage: firstNonEmpty(row.descrip, row.mensajenativo),
    apiReference: firstNonEmpty(row.tokentransid, row.trequestid),
    authorization: firstNonEmpty(row.autorizacion),
  }
}

const firstNonEmpty = (...values: Array<string | null | undefined>) =>
  values.find((value) => value?.trim())?.trim() ?? null

const toIsoString = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value.trim()
}
