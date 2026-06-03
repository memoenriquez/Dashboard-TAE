# Normalize external transactions before UI

The dashboard will map rows from the external `sales_recargas` table into a normalized transaction record before rendering KPIs, tables, detail views, or CSV exports. The normalized record uses `ticket` as the primary transaction reference, `cuentaid` as the external client id, `fechahora` as the transaction timestamp, `telefono` as the destination phone number, `SKU` plus `sku_items` as product data, `monto` as sold amount, and `codresp` as the source for normalizing success or failure.

We chose this instead of letting UI components and exports depend directly on the external database schema or on the public API contract that currently writes into that database. The source schema is outside the dashboard's ownership, so a normalized contract keeps the product language stable, makes filters and CSV behavior consistent, isolates provider-specific changes to the backend mapping layer, and prevents raw technical fields like `descrip`, `mensajenativo`, `codresp`, `tokentransid`, and `trequestid` from becoming business concepts by accident.

## Consequences

- UI, KPI, detail, and CSV behavior should depend on the normalized record, not raw external rows.
- `codresp = '0'` maps to a successful transaction; any other `codresp` maps to a failed transaction for the MVP.
- The CTC TAE API documentation refers to the operation result as `codigoRespuesta`; the dashboard maps from the persisted database column `sales_recargas.codresp`, not from API responses at read time.
- API-level fields such as `codigoMensaje`, `success`, `message`, `tokenTransaction`, and `transaccionID` are diagnostic/source-system context, not dashboard state authority.
- Published API codes may provide failure detail, including insufficient balance, invalid phone number, transmission error, region not allowed, invalid amount, unavailable credit, or maintenance in progress.
- The API balance endpoint reports current account balance, not per-transaction consumed balance, so it does not unlock balance-consumed metrics for the MVP.
- `descrip` and `mensajenativo` are response/diagnostic messages, not canonical business status. The normalized response message should prefer `sales_recargas.descrip`, fall back to `sales_recargas.mensajenativo`, and remain null when both are absent.
- The MVP has only one operator, Telcel, until a reliable multi-operator source or catalog exists.
- `tokentransid`, `trequestid`, `checktrans`, and `fechachecktrans` may support diagnostics, but they are not the primary user-facing transaction reference.
- `sales_recargas.monto` is the confirmed source for sold amount.
- `sales_recargas.descbalance` indicates whether balance was discounted, but it is not a financial amount.
- Balance consumed and commission remain future metrics and must not appear in MVP KPIs or primary table columns until the external source exposes reliable amount fields for them.
- Product display can be enriched through `sku_items.Nombre` and `sku_items.monto`; `sales_recargas.SKU` remains the source SKU.
- Visible client display can come from `cuenta.nombrenegocio` first, then `cuenta.razonsocial`, with personal name fields only as an operational fallback.
- KPI calculations must use the same normalized status and amount rules as the table and export.
- The MVP has no reversals or refunds in its transaction lifecycle.
