# Normalize external transactions before UI

The dashboard will map rows from the TAE `getTransactionsList` API into a normalized transaction record before rendering KPIs, tables, detail views, or CSV exports. The normalized record uses `ticket` as the primary transaction reference, `cuentaID` as the external client id, `fechaHora` as the transaction timestamp, `telefono` as the destination phone number, `sku` and `producto` as product data, `monto` as sold amount, and `codigoRespuesta` as the source for normalizing success or failure.

We chose this instead of letting UI components and exports depend directly on the provider payload. The source contract is outside the dashboard's ownership, so a normalized contract keeps the product language stable, makes filters and CSV behavior consistent, isolates provider-specific changes to the backend mapping layer, and prevents raw technical fields like `descripcion`, `codigoRespuesta`, and `tokenTransaction` from becoming business concepts by accident.

## Consequences

- UI, KPI, detail, and CSV behavior should depend on the normalized record, not raw external rows.
- `codigoRespuesta = '0'` maps to a successful transaction; any other `codigoRespuesta` maps to a failed transaction for the MVP.
- API-level fields such as `codigoMensaje`, `success`, `message`, `tokenTransaction`, and `transaccionID` are diagnostic/source-system context, not dashboard state authority.
- Published API codes may provide failure detail, including insufficient balance, invalid phone number, transmission error, region not allowed, invalid amount, unavailable credit, or maintenance in progress.
- The API balance endpoint reports current account balance, not per-transaction consumed balance, so it does not unlock balance-consumed metrics for the MVP.
- `descripcion` is a response/diagnostic message, not canonical business status. The normalized response message should use it when present and remain null when absent.
- The MVP has only one operator, Telcel, until a reliable multi-operator source or catalog exists.
- `tokenTransaction` may support diagnostics, but it is not the primary user-facing transaction reference.
- `monto` is the confirmed source for sold amount.
- Balance consumed and commission remain future metrics and must not appear in MVP KPIs or primary table columns until the external source exposes reliable amount fields for them.
- Product display comes from `producto`; `sku` remains the source SKU.
- Visible client display can come from `nombreNegocio` first, then `razonSocial`.
- KPI calculations must use the same normalized status and amount rules as the table and export.
- The MVP has no reversals or refunds in its transaction lifecycle.
