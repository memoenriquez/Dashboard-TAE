# Requerimiento de APIs para DB Externa

Se requieren 3 endpoints de solo lectura para consultar la base externa.

## `GET /transactions`

Consulta transacciones desde `sales_recargas`.

### Query Params

| Parametro | Requerido | Tipo | Columna DB |
|---|---:|---|---|
| `from` | Si | fecha ISO | `sales_recargas.fechahora >= @from` |
| `to` | Si | fecha ISO | `sales_recargas.fechahora <= @to` |
| `cuentaId` | No | number | `sales_recargas.cuentaid = @cuentaId` |
| `page` | No | number | paginacion |
| `pageSize` | No | number | paginacion |

### Response

| Campo API | Origen |
|---|---|
| `ticket` | `sales_recargas.ticket` |
| `cuentaId` | `sales_recargas.cuentaid` |
| `fechaHora` | `sales_recargas.fechahora` |
| `telefono` | `sales_recargas.telefono` |
| `sku` | `sales_recargas.SKU` |
| `producto` | `sku_items.Nombre` |
| `monto` | `sales_recargas.monto` |
| `codigoRespuesta` | `sales_recargas.codresp` |
| `descripcion` | `sales_recargas.descrip` |
| `mensajeNativo` | `sales_recargas.mensajenativo` |
| `tokenTransId` | `sales_recargas.tokentransid` |
| `requestId` | `sales_recargas.trequestid` |
| `nombreNegocio` | `cuenta.nombrenegocio` |
| `razonSocial` | `cuenta.razonsocial` |

### SQL Base

```sql
select
  sr.ticket,
  sr.cuentaid,
  sr.fechahora,
  sr.telefono,
  sr.SKU,
  si.Nombre as producto,
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
where sr.fechahora >= @from
  and sr.fechahora <= @to
  -- aplicar solo si se recibe cuentaId
  and sr.cuentaid = @cuentaId
order by sr.fechahora desc
offset @offset rows
fetch next @pageSize rows only
```

## `GET /external-clients`

Consulta clientes/cuentas disponibles en la base externa.

### Response

| Campo API | Origen |
|---|---|
| `cuentaId` | `cuenta.cuentaid` |
| `displayName` | `cuenta.nombrenegocio` o `cuenta.razonsocial` |

### SQL Base

```sql
select
  c.cuentaid,
  coalesce(
    nullif(ltrim(rtrim(c.nombrenegocio)), ''),
    nullif(ltrim(rtrim(c.razonsocial)), '')
  ) as displayName
from cuenta c
order by displayName asc, c.cuentaid asc
```

## `GET /balances`

Consulta saldo actual por cuenta externa.

### Query Params

| Parametro | Requerido | Tipo | Descripcion |
|---|---:|---|---|
| `cuentaId` | No | number | Si se envia, devuelve saldo solo de esa cuenta. Si no, devuelve saldos de todas las cuentas. |

### Response

| Campo API | Descripcion |
|---|---|
| `cuentaId` | ID de cuenta externa. |
| `balance` | Saldo actual disponible. |

## Reglas

- Todos los endpoints son `GET` y de solo lectura.
- `/transactions` debe requerir `from` y `to`.
