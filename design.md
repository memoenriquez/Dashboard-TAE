# Enterprise Neutral Design

Este documento define el lenguaje visual del Dashboard de Transacciones de Tiempo Aire. Su alcance es estrictamente de interfaz: no cambia reglas de negocio, autorizacion, consultas, APIs, contratos de datos ni comportamiento de flujos existentes.

## Principios

**Claridad operativa**: la interfaz existe para consultar transacciones, entender alcance, aplicar filtros y revisar detalles sin distracciones.

**Confianza sobria**: el producto debe sentirse estable, seguro y administrativo. Evitar efectos llamativos, gradientes intensos o componentes con apariencia de landing generica dentro del dashboard autenticado.

**Marca dosificada**: el azul y el verde pertenecen al logo. No representan estados de negocio. La marca puede ser mas visible en home/login, pero debe bajar de intensidad dentro del dashboard.

**Densidad comoda**: tablas, filtros y formularios deben mostrar suficiente informacion por pantalla sin sacrificar lectura, foco o accesibilidad.

## Tokens Visuales

### Paleta

- `background`: blanco ligeramente frio para paginas publicas y autenticadas.
- `foreground`: grafito profundo para texto principal.
- `muted`: superficies neutras para zonas secundarias.
- `border`: lineas suaves, visibles sin endurecer la UI.
- `brand-primary`: azul sobrio aproximado del logo, usado en identidad, foco y acciones primarias.
- `brand-accent`: verde discreto aproximado del logo, usado solo como detalle de marca.
- `success`, `warning`, `destructive`: reservados para estados reales. No deben reutilizarse para marca.

Valores aproximados iniciales:

- Azul marca: `oklch(0.39 0.13 254)`
- Verde marca: `oklch(0.62 0.13 165)`
- Grafito: `oklch(0.18 0.02 255)`
- Fondo frio: `oklch(0.985 0.006 255)`

Estos valores son placeholders razonables hasta tener HEX exactos o asset de logo.

### Superficies

- Paginas publicas: fondo neutral con acentos de marca suaves.
- Dashboard autenticado: fondo neutral, sidebar claro, contenido sobre tarjetas blancas.
- Tarjetas: borde sutil, sombra minima, radio consistente.
- Tablas: encabezados tranquilos, filas compactas, separacion clara por columnas.

### Tipografia

- Usar la familia actual del proyecto para evitar cambios tecnicos innecesarios.
- Titulos de pagina: semibold, tracking ajustado, una sola idea dominante.
- Texto de ayuda: menor contraste y longitud breve.
- Datos tabulares: preferir `tabular-nums` donde haya montos, fechas o IDs.

### Espaciado Y Densidad

- Shell publico: aireado, editorial y con marca visible.
- Shell autenticado: compacto, con margen consistente y jerarquia clara.
- Formularios: campos agrupados, labels cortos y descripciones utiles.
- Tablas: celdas con padding moderado, acciones contenidas y referencias truncables.

## Reglas De Color

- El azul de marca puede aparecer en logo textual, foco, links principales, botones primarios y acentos de navegacion.
- El verde de marca puede aparecer como punto, linea, detalle decorativo o microacento, nunca como significado de exito.
- Una transaccion exitosa usa el sistema semantico normal, no el verde de marca.
- Una transaccion fallida usa el sistema semantico destructivo.
- Evitar fondos azules dominantes dentro del dashboard autenticado para no competir con los datos.

## Layouts

### Public Shell

Aplica a `app/page.tsx` y `app/login/page.tsx`.

- Mayor presencia de marca.
- Composicion minimalista con una columna principal fuerte.
- Paneles informativos limitados y utiles.
- Acentos azul/verde en pequenas piezas visuales, no como fondos completos.

### Authenticated Shell

Aplica a `app/dashboard/layout.tsx`.

- Sidebar fijo y colapsable en desktop.
- Drawer en movil mediante el componente sidebar existente.
- Contenido principal en un area neutra con header compacto.
- Navegacion separada por secciones: Operacion y Administracion.

## Patrones De Componentes

### Sidebar

- Mostrar marca en el encabezado.
- Usar iconos simples y labels cortos.
- Resaltar item activo con token de sidebar, no con colores semanticos.
- Mantener footer con contexto operativo breve.

### Page Header

- Titulo claro.
- Descripcion de una frase.
- Metadatos o badges solo si ayudan a entender alcance, fuente o modo de operacion.

### Filter Panel

- Debe sentirse como herramienta de consulta, no como formulario pesado.
- Mantener los controles existentes y su comportamiento.
- El boton principal debe ser visualmente claro sin cambiar su accion.

### KPI Cards

- Priorizar lectura rapida del valor.
- Incluir descripcion breve de la regla de calculo.
- No inventar metricas futuras.

### Data Table

- Cabecera compacta.
- Fechas, montos y referencias con estilo tabular.
- Accion de detalle discreta.
- Estados con badges semanticos existentes.

### Detail Panel

- Mostrar detalle como ficha de lectura.
- Agrupar pares label/valor en una cuadricula compacta.
- Mantener referencias tecnicas disponibles sin hacerlas protagonistas.

### Empty And Error States

- Estado vacio: tranquilo, explica que la fuente respondio pero no hubo resultados.
- Error de fuente externa: destructivo y claro.
- No usar estado vacio para ocultar fallas.

### Admin Forms

- Formularios en tarjetas estrechas.
- Tablas/listados en tarjetas amplias.
- Mensajes breves y neutrales.
- Mantener la distincion entre Gestion Operativa de Supabase y portal admin del Dashboard.

## Guardrails

- No cambiar endpoints, payloads, nombres de parametros, filtros ni llamadas `fetch`.
- No cambiar calculos de KPI ni normalizacion de transacciones.
- No cambiar reglas de permisos, Supabase Auth ni auditoria.
- No introducir nuevas dependencias para este corte visual.
- No usar color de marca como estado de negocio.
