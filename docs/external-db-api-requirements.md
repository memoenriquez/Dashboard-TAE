# Contrato de API TAE

La aplicación no consulta directamente una base transaccional externa. Todas las lecturas externas se
realizan desde Route Handlers de Next.js hacia `TAE_API_BASE_URL` usando el
header server-only `ApiKey`.

Los endpoints actuales usan `GET` con cuerpo JSON.

## `GET /getAccountsList`

Request:

```json
{
  "cuentaID": 0
}
```

Response:

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "cuentaID": 8100000099,
      "displayName": "CTC"
    }
  ]
}
```

Uso en dashboard:

- Solo se consume desde `/api/admin/external-clients` y desde el repositorio TAE
  cuando un admin global consulta transacciones.
- `cuentaID: 0` no equivale a permisos del usuario. Next.js debe resolver scope
  con Supabase antes de llamar transacciones.
- El endpoint no entrega `transactionCount` ni `lastTransactionAt`; la UI debe
  tratarlos como `0` y `null`.

## `GET /getTransactionsList`

Request:

```json
{
  "fechaIni": "2026-06-03",
  "fechaFin": "2026-06-04",
  "cuentaID": 8100000099,
  "offSet": 0,
  "pageSize": 10
}
```

Response:

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "ticket": "124d6e0b-9751-4942-824c-392f2fdcec1f",
      "cuentaID": 8100000099,
      "fechaHora": "2026-06-03T20:30:10.15",
      "telefono": "8112106235",
      "sku": "010500001",
      "producto": "TAE Telcel 50",
      "monto": 50,
      "codigoRespuesta": "0",
      "descripcion": "Transacción aprobada",
      "tokenTransaction": "9f427b35-ef97-4d5a-b2c1-253a4284225e",
      "razonSocial": "CENTRO DE TELEFONIA CELULAR DEL NORTE",
      "nombreNegocio": "CTC"
    }
  ]
}
```

Mapeo interno:

| TAE | Interno |
|---|---|
| `cuentaID` | `externalClientId` |
| `fechaHora` | `occurredAt` |
| `sku` | `sku` |
| `producto` | `productName` |
| `codigoRespuesta` | `responseCode` y `status` |
| `descripcion` | `responseMessage` |
| `tokenTransaction` | `apiReference` |
| `nombreNegocio` / `razonSocial` | `visibleClientName` |

Gaps conocidos:

- No hay `mensajeNativo`; el fallback anterior ya no aplica.
- No hay `trequestid`; el filtro `reference` solo puede comparar `ticket` y
  `tokenTransaction`.
- No hay total de filas ni KPIs agregados. Next.js calcula `transactionCount` y
  `soldAmount` después de fusionar los resultados autorizados.
- `offSet` y `pageSize` son por `cuentaID`; la paginación global del dashboard
  se calcula después del fan-out, merge y ordenamiento.

## `GET /getBalanceAccount`

Request:

```json
{
  "cuentaID": 8100000099
}
```

Response:

```json
{
  "success": true,
  "message": null,
  "data": {
    "cuentaID": 8100000099,
    "balance": 66550,
    "ultimaAct": "2026-06-04T17:51:22.43886-06:00"
  }
}
```

Este endpoint queda fuera del alcance de la migración inicial del dashboard de
transacciones.

## Reglas

- La `ApiKey` nunca debe llegar al navegador.
- Las llamadas a `getTransactionsList` siempre deben incluir un `cuentaID`
  derivado del scope Supabase resuelto en servidor.
- Si falla una cuenta del fan-out, la respuesta completa debe fallar; no se
  presentan resultados parciales como completos.
