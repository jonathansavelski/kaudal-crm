# Prompt para Claude Code — Kaudal CRM

> Pegá esto como primer mensaje en Claude Code, dentro de una carpeta vacía.
> Está dividido en fases: pedile que arranque por la Fase 0 y vaya de a una,
> mostrándote el resultado antes de seguir.

---

## Contexto

Estoy construyendo el Trabajo Práctico Integrador del Módulo Finanzas de un posgrado de Inteligencia Artificial (UCEMA, 2026). El entregable es una aplicación web publicada en Netlify.

Vamos a construir **Kaudal CRM**: el CRM comercial interno de **Nodus**, una empresa ficticia argentina que vende un SaaS B2B de gestión logística a otras empresas. Nodus factura de dos formas: **abono mensual por suscripción** (MRR) y **proyectos de implementación** facturados por hitos.

La diferencia con un CRM común: Kaudal no muestra solo plata nominal. Toda cifra relevante se muestra también **en valor real** (deflactada por IPC) y **en dólar MEP**, porque en Argentina un cobro a 90 días vale bastante menos que su valor de factura. El CRM cruza la gestión comercial con la salud financiera de la cartera.

**Importante sobre el proceso:** antes de escribir código en cada fase, explicame el enfoque y esperá mi OK. Prefiero validar la lógica antes de que se escriba. No avances de fase por tu cuenta.

---

## Restricciones duras

- Se publica en **Netlify** como sitio estático (SPA). Debe funcionar el refresh en rutas profundas.
- Tiene **login**, con el usuario demo precargado: `demo@demo.com` / `pia2026`.
- Backend real: **Supabase** (Postgres + Auth + RLS).
- Debe consumir una **API externa en vivo**, que refresque con cada F5.
- Toda la UI en **español rioplatense**. Números y fechas en formato `es-AR`.
- El footer, presente en todas las páginas, explica las rules, skills y agentes personalizados usados, y el LLM. Es un requisito del docente, no un detalle.

## Stack fijo (no proponer alternativas)

- Vite + React + TypeScript (modo estricto)
- React Router v6
- Tailwind CSS + shadcn/ui
- TanStack Table (paginado, orden, filtros, visibilidad de columnas)
- TanStack Query (fetching y cache del API externo)
- Recharts (gráficos)
- Supabase JS client (`@supabase/supabase-js`)
- `@faker-js/faker` con locale `es_AR` (solo en el script de seed, no en el bundle)
- `date-fns` con locale `es`
- SheetJS (`xlsx`) para exportar a Excel
- Deploy: Netlify

---

# FASE 0 — Scaffolding y harness de agentes

Creá el proyecto Vite + React + TS y la estructura del harness. Esta fase es la que después describimos en el footer, así que los archivos tienen que existir de verdad y usarse.

### `CLAUDE.md` (raíz)

Resumen del proyecto, stack, comandos (`dev`, `build`, `seed`) y el índice de rules, skills y agentes.

### `.claude/rules/`

**`dinero.md`**
- La plata nunca se guarda ni se opera como `float`. Siempre enteros en centavos (`bigint` en Postgres, `number` de centavos en TS).
- Toda columna de monto viaja con su columna de moneda (`ARS` | `USD`). Nunca un monto sin moneda.
- Todo valor mostrado se etiqueta explícitamente como **nominal**, **real** (deflactado) o **USD MEP**. Está prohibido mostrar una cifra ambigua.
- Redondeo solo en la capa de presentación, nunca en la de cálculo.
- Formateo con `Intl.NumberFormat('es-AR')`.

**`stack.md`**
- TypeScript estricto. Prohibido `any` y prohibido `@ts-ignore`.
- Componentes de menos de 200 líneas; si crece, se parte.
- Los cálculos financieros viven en `src/lib/metricas/`, nunca dentro de componentes.
- Cada función de métrica tiene su test en Vitest.

**`supabase.md`**
- RLS habilitada en **todas** las tablas, sin excepción.
- La `service_role key` jamás llega al cliente ni al repo. Solo la `anon key` en el front.
- Todas las queries tipadas con los tipos generados del esquema.
- Los cambios de esquema van siempre como archivo de migración numerado en `supabase/migrations/`.

**`ui.md`**
- Toda tabla tiene paginado, estado de carga (skeleton) y estado vacío con texto útil.
- Todo gráfico tiene tooltip con valores formateados y leyenda.
- Sin emojis en la UI. Iconografía con `lucide-react`.
- Contraste accesible; la app tiene que leerse bien proyectada.

### `.claude/skills/`

**`metricas-financieras/SKILL.md`** — el diccionario canónico de fórmulas. Es la fuente de verdad: ninguna pantalla puede calcular una métrica de forma distinta a la que dice acá. Incluye (con la fórmula exacta, no solo el nombre):

- **Pipeline ponderado** = Σ (monto normalizado a ARS × probabilidad de la etapa)
- **Probabilidades por etapa**: prospecto 5%, calificado 15%, demo 30%, propuesta 50%, negociación 75%, ganada 100%, perdida 0%
- **Ciclo de venta** = promedio de (fecha de cierre real − fecha de creación) sobre oportunidades ganadas
- **MRR** = suma de abonos mensuales de contratos activos, normalizados a ARS
- **NRR** = (MRR inicial + expansión − contracción − churn) / MRR inicial
- **Churn mensual** = clientes perdidos en el mes / clientes activos al inicio del mes
- **ARPA** = MRR / clientes activos
- **CAC por canal** = costo total de acciones comerciales del canal en el período / clientes nuevos atribuidos a ese canal
- **LTV** = (ARPA × margen bruto) / churn mensual. Margen bruto asumido: 75%, parametrizable
- **DSO** = (saldo promedio de cuentas por cobrar / ventas a crédito del período) × días del período
- **Aging**: buckets por días desde el vencimiento — corriente (no vencida), 1-30, 31-60, 61-90, +90
- **VAN de la cartera** = Σ saldo_i / (1 + TEA)^(días hasta cobro esperado / 365), donde TEA = (1 + TNA/12)^12 − 1, con TNA tomada del API de tasas
- **Pérdida por inflación** de un cobro = nominal − (nominal × IPC_emisión / IPC_cobro). Para facturas abiertas se usa el IPC del último mes disponible
- **Exposición cambiaria** = % del saldo de cartera denominado en ARS. Sensibilidad: ante un salto del MEP de X%, el valor en USD de la porción en ARS cae 1 − 1/(1+X)
- **HHI de concentración** = Σ (share_i × 100)² sobre la facturación de los últimos 12 meses. Interpretación: <1500 diversificada, 1500-2500 moderada, >2500 concentrada
- **ECL (pérdida crediticia esperada)** = Σ exposición_i × PD_i, con PD por bucket de aging: corriente 1%, 1-30 2%, 31-60 8%, 61-90 20%, +90 45%, marcada incobrable 100%
- **Score de riesgo del cliente** (0-100, donde 100 es el mejor): días de mora promedio 40%, % de facturas pagadas fuera de término 30%, antigüedad como cliente 15%, peso en la facturación total (concentración, penaliza) 15%

**`seed-financiero/SKILL.md`** — cómo generar datos fake que resistan una mirada de cerca:
- Los montos siguen distribución log-normal, no uniforme. Pocas cuentas grandes, muchas chicas.
- Las facturas se derivan de oportunidades ganadas y de contratos activos: no existe factura huérfana.
- Coherencia temporal estricta: alta de empresa < creación de oportunidad < cierre < emisión de factura < vencimiento < cobro.
- ~15% de las facturas vencidas y ~4% marcadas incobrables, concentradas en pocos clientes (así el score de riesgo y el HHI dan algo interesante).
- Los sectores y tamaños de empresa correlacionan con el ticket: una empresa grande de logística no paga el mismo abono que una pyme.
- Estacionalidad: menos actividad comercial en enero y en la segunda quincena de julio.
- El churn se concentra en clientes con historial de mora, no aleatorio.

**`charts-crm/SKILL.md`** — convenciones de Recharts: paleta, formato de ejes en pesos abreviados (`$1,2 M`), tooltips con moneda y etiqueta nominal/real, altura mínima, comportamiento responsive, cómo se ve una serie sin datos.

### `.claude/agents/`

- **`arquitecto-datos`** — diseña el esquema, escribe las migraciones SQL, define índices y políticas RLS. No toca el front.
- **`analista-financiero`** — audita que las fórmulas implementadas coincidan con el skill `metricas-financieras` y que los números tengan sentido económico. Revisa cálculos y tests, no UI.
- **`frontend-crm`** — construye pantallas y componentes siguiendo `ui.md` y `charts-crm`.
- **`qa-datos`** — verifica integridad referencial en el seed y que todo agregado del dashboard sea exactamente igual a la suma de los registros individuales que lo componen.

**Entregable de la Fase 0:** proyecto que levanta con `npm run dev`, más todos estos archivos escritos. Mostrame el árbol antes de seguir.

---

# FASE 1 — Esquema de datos, migraciones y seed

Usá el agente `arquitecto-datos`.

### Tablas (todas en `public`, con `id uuid default gen_random_uuid()`, `created_at`)

| Tabla | Campos principales |
|---|---|
| `empresas` | razon_social, cuit, sector, tamanio (micro/pyme/corporativa), estado_comercial, moneda_contrato, fecha_alta, owner_comercial, ciudad, provincia |
| `contactos` | empresa_id FK, nombre, apellido, cargo, email, telefono, es_decisor bool |
| `oportunidades` | empresa_id FK, titulo, monto_centavos bigint, moneda, etapa, probabilidad, fecha_creacion, fecha_cierre_estimada, fecha_cierre_real, origen, tipo (implementacion/expansion) |
| `campanias` | nombre, canal, presupuesto_centavos, moneda, fecha_inicio, fecha_fin |
| `acciones_comerciales` | empresa_id FK, contacto_id FK nullable, oportunidad_id FK nullable, campania_id FK nullable, tipo (email/evento/demo/videollamada/llamada/visita), fecha, costo_centavos, resultado, notas |
| `contratos` | empresa_id FK, abono_mensual_centavos, moneda, fecha_inicio, fecha_fin nullable, estado (activo/pausado/cancelado), motivo_baja |
| `facturas` | empresa_id FK, contrato_id FK nullable, oportunidad_id FK nullable, numero, fecha_emision, fecha_vencimiento, monto_centavos, moneda, estado (pendiente/parcial/pagada/vencida/incobrable) |
| `cobros` | factura_id FK, fecha, monto_centavos, medio (transferencia/cheque/echeq/débito) |
| `tipo_cambio` | fecha, casa (oficial/mep/ccl/blue), compra_centavos, venta_centavos — cache del API |
| `ipc_mensual` | periodo (date, primer día del mes), indice numeric, variacion_mensual numeric |

### Estados comerciales de `empresas`
`prospecto` → `potencial` → `conversaciones_avanzadas` → `cliente` → `ex_cliente`

### Reglas
- `monto_centavos` siempre `bigint`. Cero `float` en el esquema.
- Foreign keys con `on delete restrict`, salvo `cobros → facturas` que va `on delete cascade`.
- Índices en todos los FK, en `facturas(fecha_vencimiento, estado)` y en `empresas(estado_comercial)`.
- **RLS en todas las tablas.** Es un demo mono-tenant: `select` habilitado para cualquier usuario autenticado; `insert`/`update` habilitados para autenticados en `acciones_comerciales`, `oportunidades`, `contactos` y `empresas`. Nada abierto a `anon`.
- Vista `v_saldo_facturas` con el saldo pendiente por factura (monto − cobros aplicados) y los días de mora.

### Migraciones
Archivos numerados en `supabase/migrations/`: `0001_schema.sql`, `0002_rls.sql`, `0003_vistas.sql`.

### Seed (`scripts/seed.ts`, corre con `tsx`)
Usá el skill `seed-financiero`. Volumen objetivo:

- 120 empresas (distribución: 35% prospectos/potenciales, 45% clientes activos, 12% conversaciones avanzadas, 8% ex clientes)
- ~260 contactos
- 180 oportunidades en distintas etapas, 36 meses de historia
- 24 campañas y ~900 acciones comerciales
- 70 contratos activos + 12 cancelados
- ~1400 facturas y ~1200 cobros (incluyendo parciales)
- 36 meses de `ipc_mensual` con valores realistas para Argentina
- 90 días de `tipo_cambio`

El script tiene que ser **idempotente**: `--reset` limpia y vuelve a cargar.

Al terminar, corré el agente `qa-datos` y mostrame un reporte: totales por tabla, integridad referencial, y una verificación de que la suma de facturas por empresa coincide con la facturación total.

---

# FASE 2 — Capa de métricas

Todo en `src/lib/metricas/`, funciones puras que reciben datos y devuelven números. Una función por métrica, tipada, con test de Vitest que verifique al menos un caso conocido calculado a mano.

Módulos: `pipeline.ts`, `cobranzas.ts`, `suscripciones.ts`, `riesgo.ts`, `moneda.ts` (normalización ARS/USD y deflactado por IPC).

Cuando termines, pasá el agente `analista-financiero` para que audite fórmula por fórmula contra el skill.

---

# FASE 3 — Shell de la app

- Auth con Supabase: pantalla de login limpia, con el usuario demo **visible como texto de ayuda** en la pantalla (para que el corrector no tenga que buscarlo). Sesión persistida, guard de rutas, logout.
- Layout con sidebar de navegación y topbar. En la topbar, una cinta con las cotizaciones en vivo (MEP, CCL, oficial) traídas del API.
- **Footer global** con: las rules aplicadas, los skills, los agentes personalizados, el LLM utilizado (Claude Opus 4.5 vía Claude Code) y el stack. Que sea prolijo y legible, no una lista al pie olvidada: es un ítem calificable.
- Formateadores centralizados en `src/lib/formato.ts`.
- Netlify: `public/_redirects` con `/* /index.html 200` y `netlify.toml`.

---

# FASE 4 — Pantallas

### `/` Dashboard financiero
Fila de KPIs: MRR, pipeline ponderado, DSO, saldo de cartera (nominal y real), ECL, HHI.
Gráficos:
1. Evolución de MRR y facturación, 24 meses, nominal vs. real (línea doble)
2. Embudo de pipeline por etapa (barras horizontales, con monto y cantidad)
3. Aging de cuentas por cobrar (barras apiladas por bucket)
4. Facturación por sector (torta o treemap) con el HHI al lado
5. CAC vs. LTV por canal de adquisición (barras agrupadas)
6. Top 10 clientes por facturación, con su score de riesgo como color

Todos con tooltip. Cada KPI con popover que explica la fórmula en una línea.

### `/pipeline`
Vista por etapa (columnas tipo kanban, o tabla agrupada). Total y total ponderado por etapa. Forecast a 3 y 6 meses. Filtros por owner, origen, tipo y rango de monto. Click en una oportunidad abre un panel lateral con el detalle y sus acciones asociadas.

### `/cuentas`
Tabla maestra con TanStack Table: paginado, orden por cualquier columna, filtros por estado comercial, sector, tamaño, provincia, owner y rango de facturación. **Contador visible de "X de 120 cuentas cumplen los filtros"**. Selector de columnas visibles. Exportar el resultado filtrado a Excel.

### `/cuentas/:id`
Ficha individual: datos de la empresa, contactos, contrato vigente, métricas propias del cliente (facturación 12 meses, saldo pendiente, días de mora promedio, score de riesgo, LTV estimado), timeline cronológico de acciones comerciales, tabla de facturas con su estado. Botón para cargar una acción comercial nueva y para editar el estado comercial de la cuenta.

### `/cobranzas`
Aging con drill-down: click en un bucket filtra la tabla de facturas. DSO del período. VAN de la cartera con la tasa traída del API, y un input para cambiarla manualmente. Provisión por incobrabilidad. Exportar a Excel.

### `/acciones`
Tabla de acciones comerciales con filtros por tipo, campaña, fecha y resultado. Alta de acción nueva (formulario con validación). Vista de campañas con presupuesto, acciones generadas, oportunidades atribuidas y ROI.

### `/mercado`
Cotizaciones del día (MEP, CCL, oficial, blue, tarjeta), serie de inflación mensual, riesgo país, tasas.
**Simulador de escenarios**: dos sliders — salto del MEP (0% a +100%) e inflación mensual esperada (0% a 15%) — que recalculan en vivo el valor real de la cartera, el forecast del pipeline y la exposición cambiaria. Gráfico comparativo escenario base vs. escenario simulado.

---

# FASE 5 — API externa en vivo

Fuentes (todas gratuitas, sin API key, con CORS habilitado):
- `https://dolarapi.com/v1/dolares` — oficial, blue, MEP, CCL, tarjeta
- `https://api.argentinadatos.com/v1/finanzas/indices/inflacion` — inflación mensual
- `https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo`
- `https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo` — para la tasa de descuento

Requisitos:
- Fetch con TanStack Query, `staleTime` corto para que refresque con cada F5.
- Cada respuesta exitosa se cachea en la tabla `tipo_cambio` de Supabase.
- **Fallback obligatorio**: si el API no responde, se usa el último valor cacheado y la UI lo indica con un cartel discreto ("cotización del DD/MM, sin conexión al mercado"). La app nunca se rompe ni muestra `NaN` por un API caído.
- Indicador de "última actualización" con hora.

---

# FASE 6 — Cierre

- Pasada de `qa-datos`: que todo agregado del dashboard cuadre con los individuales.
- Estados de carga y vacío en todas las tablas y gráficos.
- Responsive: que se vea bien en notebook y en tablet.
- `README.md` con instalación, variables de entorno y decisiones de diseño.
- Build de producción sin warnings y sin `console.log`.
- Instrucciones exactas para conectar Supabase y publicar en Netlify.

---

## Definition of done (chequear contra la consigna)

- [ ] Datos fake autogenerados por script, coherentes entre tablas
- [ ] Más de 2 páginas navegables con rutas reales
- [ ] Gráficos con tooltips y tablas con paginado, orden y filtros
- [ ] Datos agregados (dashboard) e individuales (ficha de cuenta) sobre 10 tablas relacionadas
- [ ] Footer explicando rules, skills, agentes y LLM
- [ ] Opcional: login con usuario pre-registrado
- [ ] Opcional: backend SQL externo (Supabase)
- [ ] Opcional: datos en tiempo real desde API con cada F5
- [ ] Opcional: exportación a Excel

**Arrancá por la Fase 0 y frená para que la revise.**
