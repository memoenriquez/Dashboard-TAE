import { describe, expect, it } from "vitest"

import { normalizeTransactionRow } from "./normalize"

describe("normalizeTransactionRow", () => {
  it("normalizes a successful Telcel transaction from external rows", () => {
    expect(
      normalizeTransactionRow({
        ticket: "T-1",
        cuentaid: 100,
        fechahora: new Date("2026-01-01T12:00:00.000Z"),
        telefono: "5512345678",
        SKU: "TELCEL100",
        productName: "Telcel 100",
        monto: "100.50",
        codresp: "0",
        descrip: "Operacion exitosa",
        mensajenativo: "ignored",
        tokentransid: "api-token",
        trequestid: "request-id",
        nombrenegocio: "Tienda Centro",
        razonsocial: "Razon Social SA",
      })
    ).toEqual({
      ticket: "T-1",
      externalClientId: 100,
      visibleClientName: "Tienda Centro",
      occurredAt: "2026-01-01T12:00:00.000Z",
      status: "successful",
      phoneNumber: "5512345678",
      operatorName: "Telcel",
      sku: "TELCEL100",
      productName: "Telcel 100",
      soldAmount: 100.5,
      responseCode: "0",
      responseMessage: "Operacion exitosa",
      apiReference: "api-token",
    })
  })

  it("normalizes failed responses with documented fallbacks", () => {
    expect(
      normalizeTransactionRow({
        ticket: "T-2",
        cuentaid: "201",
        fechahora: "2026-01-02T10:30:00.000Z",
        telefono: "5599999999",
        SKU: "TELCEL50",
        productName: null,
        monto: 50,
        codresp: "3",
        descrip: " ",
        mensajenativo: "Saldo insuficiente",
        tokentransid: null,
        trequestid: "request-id",
        nombrenegocio: null,
        razonsocial: "Razon Fallback",
      })
    ).toMatchObject({
      status: "failed",
      responseMessage: "Saldo insuficiente",
      apiReference: "request-id",
      visibleClientName: "Razon Fallback",
    })
  })

  it("preserves the timestamp returned by the external API", () => {
    expect(
      normalizeTransactionRow({
        ticket: "T-3",
        cuentaid: 301,
        fechahora: "2026-06-03T10:00:00.000-06:00",
        telefono: "5511111111",
        SKU: "TELCEL20",
        productName: "Telcel 20",
        monto: 20,
        codresp: "0",
        descrip: "Operacion exitosa",
        mensajenativo: null,
        tokentransid: "api-token",
        trequestid: null,
        nombrenegocio: "Tienda Norte",
        razonsocial: null,
      }).occurredAt
    ).toBe("2026-06-03T10:00:00.000-06:00")
  })
})
