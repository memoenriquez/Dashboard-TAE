# Dashboard de Transacciones de Tiempo Aire

Este contexto define el lenguaje de dominio para un dashboard donde clientes revisan transacciones de tiempo aire originadas via API. El dashboard no es la fuente de verdad de las transacciones; observa una base transaccional externa y usa su propia base para usuarios, permisos y alcance de consulta.

## Language

**Dashboard**:
Aplicacion de consulta donde un usuario autenticado revisa transacciones de tiempo aire asociadas a su alcance permitido.
_Avoid_: backoffice, consola operativa global

**Transaccion de Tiempo Aire**:
Registro de una operacion de recarga o venta de tiempo aire consultable desde la fuente transaccional externa.
_Avoid_: orden, compra, movimiento

**Fuente Transaccional Externa**:
Base de datos existente que ya transacciona via API y conserva la verdad sobre las transacciones de tiempo aire.
_Avoid_: base del dashboard, copia local

**Tabla de Recargas**:
Tabla `sales_recargas` de la fuente externa que conserva los registros de transacciones de tiempo aire.
_Avoid_: tabla de estado, tabla de usuarios

**Cuenta Externa**:
Registro `cuenta` de la fuente externa que representa la cuenta comercial asociada a transacciones.
_Avoid_: usuario del dashboard, perfil Supabase

**Catalogo SKU**:
Tabla `sku_items` de la fuente externa usada para enriquecer el SKU con nombre de producto y monto nominal.
_Avoid_: fuente de transacciones

**Servicio API TAE**:
API externa que actualmente origina operaciones de tiempo aire y escribe resultados en la fuente transaccional externa.
_Avoid_: fuente directa del dashboard, contrato de UI

**Base del Dashboard**:
Base de datos propia del dashboard usada para gestionar usuarios, clientes, grupos y permisos.
_Avoid_: fuente de verdad transaccional

**Gestion Operativa de Supabase**:
Administracion de infraestructura Supabase, tablas, politicas y configuracion de autenticacion desde el Dashboard de Supabase.
_Avoid_: operacion diaria de clientes, migraciones locales como fuente operativa, cambios implicitos

**Administrador Interno**:
Operador interno responsable de crear clientes, grupos y usuarios del dashboard.
_Avoid_: usuario del cliente, self-service

**Usuario**:
Persona autenticada que accede al dashboard en nombre de un cliente.
_Avoid_: cliente, comercio

**Cliente**:
Entidad comercial que tiene un identificador externo y un alcance definido de transacciones consultables.
_Avoid_: usuario, cuenta

**Cliente Padre**:
Cliente con permiso para consultar sus propias transacciones y las de los clientes hijos que pertenecen a su grupo.
_Avoid_: administrador global, jerarquia recursiva

**Cliente Hijo**:
Cliente que solo puede consultar sus propias transacciones y no las de otros clientes hijos.
_Avoid_: subcliente jerarquico

**Grupo de Clientes**:
Asociacion plana que permite a un cliente padre consultar transacciones de varios clientes hijos.
_Avoid_: arbol de clientes, jerarquia recursiva

**Cliente Visible**:
Cliente cuyas transacciones forman parte del alcance consultado y se muestra como dimension en tabla, filtros y exportacion.
_Avoid_: tenant oculto, filtro implicito

**Alcance de Consulta**:
Conjunto de clientes externos que un usuario puede consultar en una peticion del dashboard.
_Avoid_: permiso implicito, filtro opcional

**External Client ID**:
Identificador existente en la fuente transaccional externa que vincula un cliente del dashboard con sus transacciones.
_Avoid_: tenant id interno, user id

**Consumo**:
Conjunto de metricas del rango consultado; no debe usarse como una cifra unica sin especificar la metrica.
_Avoid_: total ambiguo

**KPI del Dashboard**:
Metrica resumida calculada para el rango, filtros y alcance de consulta actuales.
_Avoid_: metrica de pagina visible

**Monto Vendido**:
Suma monetaria vendida o recargada al usuario final en las transacciones del rango.
_Avoid_: consumo, saldo

**Saldo Consumido**:
Monto debitado del saldo o cuenta operativa del cliente por las transacciones del rango.
_Avoid_: monto vendido, comision

**Numero de Transacciones**:
Cantidad de transacciones encontradas para el rango y alcance consultado.
_Avoid_: consumo

**Comision**:
Ganancia o margen atribuible a las transacciones del rango.
_Avoid_: monto vendido, saldo consumido

**Auditoria Minima**:
Registro de eventos sensibles del dashboard necesarios para rastrear accesos globales, exportaciones, detalles y cambios de permisos.
_Avoid_: log de cada listado normal

**Evento de Auditoria**:
Registro individual de una accion sensible realizada en el dashboard.
_Avoid_: log tecnico generico, evento de telemetria

**Transaccion Exitosa**:
Transaccion completada correctamente en la fuente transaccional externa.
_Avoid_: aprobada, aplicada

**Transaccion Fallida**:
Transaccion que no se completo correctamente en la fuente transaccional externa.
_Avoid_: rechazada, error

**Numero Telefonico**:
Numero del usuario final asociado a la transaccion y visible completo para el cliente autorizado.
_Avoid_: referencia anonima, ultimos cuatro digitos

**Referencia Transaccional**:
Identificador o referencia externa que permite ubicar una transaccion especifica en la fuente transaccional externa.
_Avoid_: id interno del dashboard

**Referencia API**:
Identificador tecnico de la solicitud o token transaccional que ayuda a diagnosticar una transaccion originada via API.
_Avoid_: referencia transaccional principal

**Codigo de Respuesta**:
Codigo tecnico de la fuente externa usado para derivar si una transaccion fue exitosa o fallida.
_Avoid_: estado mostrado sin normalizar

**Codigo de Mensaje**:
Codigo tecnico de detalle publicado por el Servicio API TAE para explicar algunas respuestas fallidas.
_Avoid_: estado principal, estado de negocio

**Mensaje de Respuesta**:
Descripcion legible o nativa de la fuente externa que explica la respuesta de una transaccion.
_Avoid_: estado de negocio

**Respuesta de Proveedor**:
Codigo o mensaje tecnico de la fuente externa o proveedor usado para diagnosticar una transaccion.
_Avoid_: estado de negocio

**Operador**:
Proveedor de telefonia asociado a la transaccion de tiempo aire.
_Avoid_: cliente, usuario, cuenta

**Registro de Transaccion Normalizado**:
Representacion canonica que el dashboard usa para mostrar, filtrar, exportar y detallar transacciones sin depender de nombres internos de la fuente externa.
_Avoid_: esquema crudo, fila externa

**Pagina de Resultados**:
Subconjunto ordenado de transacciones que se muestra en la tabla para un filtro y alcance dados.
_Avoid_: resultado completo

**Vista Principal de Transacciones**:
Pantalla principal del MVP donde el usuario filtra, revisa KPIs, consulta tabla, abre detalle y exporta CSV.
_Avoid_: reporte estatico, monitor en tiempo real

**Estado Vacio**:
Estado de la vista cuando no existen transacciones para el rango, filtros y alcance actuales.
_Avoid_: error silencioso

**Error de Fuente Externa**:
Estado de la vista cuando la fuente transaccional externa falla, tarda demasiado o no puede responder de forma completa.
_Avoid_: tabla vacia, resultado parcial

**Backup Local de Fuente Externa**:
Copia local de la fuente transaccional externa usada para desarrollar y validar el prototipo sin operar contra produccion.
_Avoid_: nueva fuente de verdad, copia editable

**Rango de Consulta**:
Periodo de fechas que el usuario selecciona para consultar transacciones, con un maximo interactivo de 90 dias.
_Avoid_: consulta sin limite

**Endpoint del Dashboard**:
Ruta backend propia del dashboard que aplica autenticacion, alcance y reglas del producto antes de consultar o devolver informacion.
_Avoid_: endpoint directo de la API TAE, consulta desde el navegador a la fuente externa

**Exportacion CSV**:
Descarga de transacciones filtradas para el alcance permitido del usuario.
_Avoid_: reporte oficial, conciliacion automatica

**Contrato de Prototipo**:
Documento tecnico que fija el primer corte implementable, rutas internas, tablas, variables y criterios de demo del prototipo.
_Avoid_: PRD completo, documentacion de usuario final

**MVP**:
Primera version funcional del dashboard con alcance deliberadamente acotado para consulta segura de transacciones.
_Avoid_: producto completo, analitica avanzada

## Relationships

- Un **Usuario** pertenece a un **Cliente**.
- Todos los **Usuarios** de un mismo **Cliente** tienen los mismos permisos funcionales en el MVP.
- Un **Cliente** tiene un **External Client ID** usado para filtrar la **Fuente Transaccional Externa**.
- El **External Client ID** corresponde a `sales_recargas.cuentaid` y referencia una **Cuenta Externa**.
- Un **Administrador Interno** crea clientes, grupos y usuarios; el MVP no ofrece alta self-service.
- Un **Administrador Interno** puede consultar transacciones de cualquier cliente, pero no modifica transacciones externas.
- La **Gestion Operativa de Supabase** se realiza desde el Dashboard de Supabase para crear tablas, aplicar politicas y configurar autenticacion.
- El portal admin del **Dashboard** gestiona la operacion diaria de clientes, perfiles, grupos, membresias y usuarios del dashboard; esto no reemplaza la **Gestion Operativa de Supabase**.
- El repositorio conserva SQL de referencia de Supabase, pero no es la fuente operativa de migraciones.
- Un **Cliente Padre** puede consultar sus propias transacciones y las de los **Clientes Hijos** incluidos en su **Grupo de Clientes**.
- Un **Cliente Hijo** solo puede consultar transacciones asociadas a su propio **External Client ID**.
- El **Alcance de Consulta** de un **Cliente Padre** incluye su propio **External Client ID** y los **External Client ID** de sus clientes hijos.
- El **Cliente Visible** se muestra en tabla, filtros y **Exportacion CSV** cuando el usuario puede consultar mas de un cliente.
- Una **Transaccion de Tiempo Aire** pertenece a exactamente un **External Client ID** en la fuente externa.
- Una **Transaccion de Tiempo Aire** tiene estado **Transaccion Exitosa** o **Transaccion Fallida**.
- La **Transaccion Exitosa** se deriva cuando `sales_recargas.codresp = '0'`.
- La **Transaccion Fallida** se deriva cuando `sales_recargas.codresp <> '0'`.
- Una **Transaccion Fallida** cuenta para **Numero de Transacciones**, pero no suma **Monto Vendido**, **Saldo Consumido** ni **Comision**.
- El **Registro de Transaccion Normalizado** desacopla la experiencia del dashboard del esquema real de la fuente externa.
- El **Registro de Transaccion Normalizado** se alimenta principalmente desde la **Tabla de Recargas** y se enriquece con **Cuenta Externa** y **Catalogo SKU**.
- El **Dashboard** consulta la **Fuente Transaccional Externa** mediante backend propio con credenciales de solo lectura.
- Durante el prototipo, el **Dashboard** consulta un **Backup Local de Fuente Externa** con credenciales de solo lectura.
- La **Base del Dashboard** no almacena la verdad de las transacciones; almacena usuarios, clientes, grupos y permisos.
- La **Base del Dashboard** representa clientes, usuarios/perfiles, grupos de clientes y miembros de grupo como conceptos separados.
- El **Rango de Consulta** es obligatorio, inicia por defecto en los ultimos 7 dias y no debe exceder 90 dias en consultas interactivas.
- El MVP permite ver, filtrar, abrir detalle y generar **Exportacion CSV**; no modifica transacciones externas.
- La **Vista Principal de Transacciones** contiene filtros, **KPI del Dashboard**, **Pagina de Resultados**, detalle y **Exportacion CSV**.
- La UI del prototipo usa componentes shadcn/ui para los elementos visuales e interactivos; los layouts propios solo componen esos componentes con Tailwind semantico.
- Los KPIs MVP son **Numero de Transacciones** y **Monto Vendido**.
- El unico **Operador** del MVP es Telcel; no hay catalogo multioperador en el primer prototipo.
- Los filtros MVP son rango de fecha, estado, cliente visible, numero telefonico exacto, operador Telcel y **Referencia Transaccional**.
- La tabla MVP muestra fecha/hora, estado, operador Telcel, producto, **Numero Telefonico**, **Monto Vendido**, **Cliente Visible** y **Referencia Transaccional**.
- La **Referencia Transaccional** principal viene de `sales_recargas.ticket`.
- La **Referencia API** viene de `sales_recargas.tokentransid` o `sales_recargas.trequestid` y se usa para diagnostico.
- El **Servicio API TAE** publica el flujo `getUserTransaction` -> `doTransaction` -> `checkTransaction`; ese flujo da contexto diagnostico, pero el dashboard MVP consulta la **Tabla de Recargas** ya persistida.
- El `codigoRespuesta` publicado por el **Servicio API TAE** corresponde conceptualmente al **Codigo de Respuesta** persistido como `sales_recargas.codresp`; el mapeo del dashboard debe seguir usando el nombre confirmado en la base externa.
- El **Servicio API TAE** publica `codigoRespuesta = "0"` como exito, `codigoRespuesta = "3"` como fracaso, y codigos `1`, `2`, `4`, `5`, `6`, `7`, `8`, `9` para estados o errores tecnicos de consulta; el MVP conserva solo **Transaccion Exitosa** y **Transaccion Fallida** como estados de negocio del dashboard.
- Cuando el **Codigo de Respuesta** indica fracaso, el **Codigo de Mensaje** puede explicar detalles como saldo insuficiente, telefono no valido, error de transmision, activacion no permitida para la region, monto no valido, credito no disponible o mantenimiento en curso.
- `success` y `message` de la respuesta HTTP del **Servicio API TAE** son envoltura tecnica de la API; no reemplazan el estado normalizado del dashboard.
- El endpoint de saldo del **Servicio API TAE** describe balance actual de cuenta, no monto consumido por transaccion; por eso no habilita **Saldo Consumido** como KPI MVP.
- La **Respuesta de Proveedor** visible en detalle usa `sales_recargas.descrip`; si viene vacio o nulo, usa `sales_recargas.mensajenativo`; si ambos faltan, queda como no disponible.
- El **Numero Telefonico** viene de `sales_recargas.telefono`.
- El **Monto Vendido** viene de `sales_recargas.monto`.
- El producto base viene de `sales_recargas.SKU` y puede enriquecerse con `sku_items.Nombre` y `sku_items.monto`.
- El **Cliente Visible** debe preferir `cuenta.nombrenegocio` cuando exista; si no existe, usar `cuenta.razonsocial`; nombres personales de `cuenta` son fallback operativo.
- `sales_recargas.descbalance` puede indicar si se desconto balance, pero no representa un monto financiero.
- **Saldo Consumido** y **Comision** no se muestran en KPIs ni columnas del MVP; quedan como metricas futuras hasta tener fuente confiable.
- No existen reversos ni reembolsos en el flujo actual del MVP.
- La tabla usa **Pagina de Resultados** ordenada por fecha/hora descendente; los KPIs no se calculan desde la pagina visible.
- Los KPIs se calculan sobre todas las transacciones que cumplen filtros, rango y **Alcance de Consulta**.
- El detalle de transaccion muestra los campos de tabla mas timestamps, **Referencia Transaccional**, **Respuesta de Proveedor** y cliente asociado.
- La **Exportacion CSV** respeta exactamente los filtros activos, el alcance permitido y el maximo de 90 dias.
- La **Auditoria Minima** del MVP registra exportaciones CSV, apertura de detalle de transaccion, cambios de permisos o mapeos, y accesos de **Administrador Interno**.
- Cada accion dentro de la **Auditoria Minima** produce un **Evento de Auditoria**.
- La **Auditoria Minima** no registra listados normales para evitar ruido operativo excesivo.
- El MVP permite **Numero Telefonico** completo en tabla, detalle y **Exportacion CSV** con **Auditoria Minima** sobre los eventos sensibles.
- Si la **Fuente Transaccional Externa** falla o excede tiempo de respuesta, el dashboard muestra **Error de Fuente Externa** y permite reintento manual; no presenta resultados parciales como completos.
- El **Estado Vacio** solo se usa cuando la consulta completa responde correctamente sin transacciones.
- El **MVP** incluye login, permisos por cliente o grupo, vista principal, filtros, KPIs de **Numero de Transacciones** y **Monto Vendido**, tabla paginada, detalle, **Exportacion CSV**, **Auditoria Minima** y manejo de errores.
- El primer prototipo implementable queda definido por el **Contrato de Prototipo** y usa Next.js estable, Supabase Auth real, administracion minima y lectura de la fuente externa mediante backend.
- El **MVP** no incluye **Saldo Consumido**, **Comision**, reversos, reembolsos, reportes asincronos ni analitica avanzada.
- La fuente externa ya tiene indices utiles para `ticket`, `telefono`, `cuentaid`, `cuenta.cuentaid` y `sku_items.SKU`; antes de produccion formal se debe revisar o agregar indice para `sales_recargas.fechahora`, idealmente compuesto con `cuentaid`.
- Antes de produccion formal se debe revisar separacion de entornos, indices de la fuente externa, timeouts de consulta, auditoria de exportaciones y manejo de PII en CSV.

## Example dialogue

> **Dev:** "Si un usuario de un cliente hijo entra al dashboard, puede ver las transacciones de otro cliente hijo del mismo grupo?"
> **Domain expert:** "No. El cliente hijo solo ve sus propias transacciones. El cliente padre es quien puede ver las transacciones de los clientes hijos de su grupo."
>
> **Dev:** "El dashboard guarda las transacciones para mostrarlas despues?"
> **Domain expert:** "No como fuente de verdad. Las transacciones se consultan desde la base externa; la base del dashboard se usa para usuarios y permisos."
>
> **Dev:** "Cuando decimos consumo, mostramos una sola cifra?"
> **Domain expert:** "No. Consumo debe separarse en metricas como monto vendido, saldo consumido, numero de transacciones y comision."
>
> **Dev:** "Si el cliente padre exporta transacciones, puede sacar mas datos que los visibles en pantalla?"
> **Domain expert:** "No. La exportacion debe respetar los mismos filtros, el mismo alcance y el limite de 90 dias."
>
> **Dev:** "Una transaccion fallida suma al monto vendido?"
> **Domain expert:** "No. Cuenta en el numero de transacciones, pero no en monto vendido, saldo consumido ni comision."
>
> **Dev:** "Los KPIs deben coincidir con la pagina visible de la tabla?"
> **Domain expert:** "No. La pagina visible es solo una parte del resultado; los KPIs se calculan sobre todo el rango filtrado y permitido."
>
> **Dev:** "Si la fuente externa responde a medias, mostramos lo que alcance a llegar?"
> **Domain expert:** "No. Mostramos un error claro y dejamos que el usuario reintente manualmente."
>
> **Dev:** "Una tabla vacia puede significar que fallo la fuente externa?"
> **Domain expert:** "No. Si fallo la fuente externa, se muestra error. La tabla vacia solo significa que la consulta completa no encontro transacciones."
>
> **Dev:** "De donde sale el estado si `sales_recargas` no tiene columna `estado`?"
> **Domain expert:** "Se normaliza desde `codresp`: `0` es exitosa y cualquier otro codigo es fallida."
>
> **Dev:** "La documentacion de la API habla de `codigoRespuesta`, `codigoMensaje` y `success`; usamos esos nombres directo en el dashboard?"
> **Domain expert:** "No. Sirven para diagnostico y contexto del servicio que escribe la fuente externa, pero el dashboard lee `sales_recargas.codresp` y lo normaliza a estados de negocio."
>
> **Dev:** "Podemos calcular comision si no viene en la fuente externa?"
> **Domain expert:** "No. Si no hay campo confiable, comision se muestra como no disponible en el MVP."
>
> **Dev:** "El administrador interno puede ver todas las transacciones?"
> **Domain expert:** "Si. En el MVP puede configurar metadata y consultar transacciones de cualquier cliente, pero no modificar transacciones externas."
>
> **Dev:** "Auditamos todos los listados?"
> **Domain expert:** "No. Auditamos exportaciones, detalle, cambios de permisos/mapeos y accesos de administrador interno; los listados normales quedan fuera."
>
> **Dev:** "Supabase se configura desde migraciones locales del repo?"
> **Domain expert:** "No. Para este prototipo se administra desde el Dashboard de Supabase; el repo solo conserva SQL de referencia para reproducibilidad."
>
> **Dev:** "Entonces el portal admin ya no administra clientes o usuarios?"
> **Domain expert:** "Si los administra. Supabase Dashboard se usa para infraestructura y configuracion; el portal admin gestiona la operacion diaria del dashboard."
>
> **Dev:** "El prototipo consultara produccion directamente?"
> **Domain expert:** "No. Se conectara desde local a un backup de la fuente externa con usuario de solo lectura."
>
> **Dev:** "De donde sale el mensaje visible de respuesta?"
> **Domain expert:** "Del campo `descrip`; si no existe, usamos `mensajenativo` como respaldo. Ese mensaje es diagnostico, no el estado del negocio."

## Flagged ambiguities

- "Consumo" se uso inicialmente de forma ambigua; queda resuelto como un conjunto de metricas separadas, no como un unico total.
- "Cliente padre/subcliente" parecia una jerarquia recursiva; queda resuelto como **Grupo de Clientes**, una asociacion plana donde el **Cliente Padre** ve miembros y el **Cliente Hijo** solo se ve a si mismo.
- "Base de datos del dashboard" podia confundirse con la fuente de transacciones; queda resuelto que la **Fuente Transaccional Externa** conserva la verdad transaccional y la **Base del Dashboard** gestiona identidad, permisos y alcance.
- "Usuario" y "Cliente" son conceptos distintos: el usuario inicia sesion, el cliente define el alcance comercial y el `External Client ID`.
- "Permisos por usuario" queda fuera del MVP; todos los usuarios de un mismo cliente tienen el mismo permiso funcional.
- "Cliente Padre" no significa administrador global; solo amplia su alcance a su propio cliente y a los clientes hijos de su grupo.
- "Exportacion" no es una via para ampliar alcance o rango; usa los mismos filtros y restricciones de la consulta interactiva.
- "Pagina de resultados" no equivale al resultado completo; los KPIs deben calcularse sobre todo el conjunto filtrado permitido.
- "Estado vacio" y "error de fuente externa" son estados distintos; no se debe esconder una falla externa como ausencia de transacciones.
- "Contrato de transaccion" no debe confundirse con el esquema real de la fuente externa; el dashboard trabaja con un **Registro de Transaccion Normalizado**.
- El **Backup Local de Fuente Externa** no es una fuente de verdad nueva; solo es el entorno de desarrollo para validar consultas contra una copia de la fuente real.
- La **Gestion Operativa de Supabase** no implica que el repositorio ignore el modelo; el SQL de referencia documenta la estructura esperada, pero los cambios se aplican manualmente desde Supabase Dashboard.
- La **Gestion Operativa de Supabase** no sustituye el portal admin del producto; el portal admin sigue siendo la herramienta para administrar clientes, perfiles, grupos, membresias y usuarios del dashboard.
- "`estado` no existe como columna en `sales_recargas`; el estado de negocio del dashboard se deriva de **Codigo de Respuesta**."
- El MVP no tiene multiples operadores; **Operador** queda fijo como Telcel hasta que exista una fuente confiable o catalogo multioperador.
- La documentacion del **Servicio API TAE** usa nombres como `codigoRespuesta`, `codigoMensaje`, `tokenTransaction`, `transaccionID` y `success`; esos nombres dan contexto diagnostico, pero no sustituyen el mapeo confirmado de la **Tabla de Recargas**.
- "`descbalance` no es **Saldo Consumido**; solo indica si hubo descuento de balance y no debe tratarse como monto."
- **Saldo Consumido** y **Comision** pertenecen a metricas futuras hasta que exista fuente confiable; no deben aparecer como columnas vacias en el MVP.
- La PII sigue siendo sensible aunque el MVP tenga **Auditoria Minima**; antes de produccion formal se debe revisar el manejo de PII en CSV.
