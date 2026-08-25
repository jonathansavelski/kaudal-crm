# Kaudal CRM

CRM comercial interno de **Nodus**, una empresa ficticia argentina que vende un SaaS B2B de
gestión logística. Nodus factura de dos formas: abono mensual por suscripción (MRR) y
proyectos de implementación facturados por hitos.

**Lo que diferencia a Kaudal de un CRM común:** no muestra solo plata nominal. Toda cifra
relevante se muestra además en **valor real** (deflactada por IPC) y en **dólar MEP**.

Eso no es un adorno. En la ventana que cubren los datos —agosto 2023 a julio 2026— la
inflación acumulada real fue del **490%** mientras el dólar MEP subió **127%**. Nominal,
real y USD MEP no son tres columnas parecidas: cuentan **tres historias distintas**. Un
cobro a 90 días vale bastante menos que su valor de factura, y este CRM existe para hacer
visible esa brecha.

Trabajo Práctico Integrador — Módulo Finanzas, posgrado en Inteligencia Artificial,
UCEMA 2026.

---

## Demo

**https://kaudal-crm.netlify.app**

| | |
|---|---|
| Usuario | `demo@demo.com` |
| Contraseña | `pia2026` |

Las credenciales también están visibles en la pantalla de login, a propósito.

---

## Instalación

Requiere Node 20 o superior (se desarrolló con 24).

```bash
npm install
cp .env.example .env    # completar con las claves propias
npm run dev
```

### Variables de entorno

`.env` está en `.gitignore` desde el primer commit. Lo versionado es `.env.example`.

| Variable | Para qué | ¿Puede ir al repo? |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto | Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente del navegador | **Sí, es pública por diseño** |
| `SUPABASE_SECRET_KEY` | Solo el seed. Saltea RLS | **Nunca** |
| `SUPABASE_DB_PASSWORD` | Solo migraciones y tipos | **Nunca** |
| `SUPABASE_DB_HOST` | Host del pooler regional | Sí |

Las dos primeras se cargan también en Netlify. **Las otras dos, jamás**: solo viven en la
máquina local. La `Secret key` saltea RLS y la DB password da acceso total a Postgres.

Ninguna clave secreta lleva el prefijo `VITE_`, porque Vite embebe en el bundle todo lo
que empiece así.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo `tsc -b` |
| `npm run lint` | oxlint |
| `npm run test` | Vitest, una pasada |
| `npm run migrar` | Aplica las migraciones SQL |
| `npm run tipos` | Regenera `src/types/supabase.ts` del esquema |
| `npm run macro` | Baja y congela las series macro reales |
| `npm run seed` | Carga datos en Supabase |
| `npm run seed:reset` | Limpia y recarga desde cero |

---

## Conectar un Supabase propio

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. De **Project Settings → API Keys**, copiar la *Publishable key* y la *Secret key* al `.env`.
3. De **Project Settings → Database**, copiar la *Database password*.
4. Aplicar el esquema y cargar los datos:

```bash
npm run migrar && npm run tipos && npm run seed
```

El seed crea también el usuario demo. Es **determinista**: la misma corrida produce
siempre los mismos datos, así que los números de este README se pueden verificar.

> **Nota sobre los tipos.** No usamos `npx supabase gen types`: la conexión directa de
> Supabase hoy solo se publica por IPv6 y no resuelve desde cualquier red, el probe de SSL
> del CLI timeoutea contra el pooler, y en el puerto 6543 exige Docker.
> `scripts/generar-tipos.ts` introspecciona el esquema con el driver `pg` que ya se usa
> para migraciones y seed. Solo necesita la DB password.

## Publicar en Netlify

1. **Add new project → Import from GitHub**, elegir el repo.
2. El build sale de `netlify.toml`; no hay que configurar nada a mano.
3. Cargar **solo** `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en las variables
   de entorno del sitio.
4. Deploy.

`public/_redirects` tiene el `/* /index.html 200` que hace que el refresh en una ruta
profunda (por ejemplo `/cuentas/:id`) no devuelva 404.

> Las variables `VITE_` se embeben **en tiempo de build**. Si se cambia una, hay que
> redeployar con *Clear cache and deploy site*: sin eso el bundle viejo sigue teniendo el
> valor anterior.

---

## Stack

| Capa | Herramienta |
|---|---|
| Build | Vite 8 + React 19 + TypeScript 6 (estricto) |
| Ruteo | React Router v6 |
| Estilos | Tailwind CSS v4 + shadcn/ui (new-york) |
| Tablas | TanStack Table |
| Fetching | TanStack Query |
| Gráficos | Recharts |
| Backend | Supabase (Postgres + Auth + RLS) |
| Fechas | date-fns, locale `es` |
| Excel | SheetJS (`xlsx`) |
| Seed | `@faker-js/faker` + `tsx` |
| Tests | Vitest |
| Lint | oxlint |
| Deploy | Netlify (SPA estática) |

---

## Cómo está organizado

```
.claude/            harness: rules, skills y agentes
  rules/            dinero · stack · supabase · ui
  skills/           metricas-financieras · seed-financiero · charts-crm
  agents/           arquitecto-datos · analista-financiero · frontend-crm · qa-datos
src/
  lib/
    metricas/       las 17 fórmulas financieras, puras y testeadas
    agregados/      agrupa y normaliza para las pantallas; no define fórmulas
    api/            clientes de los APIs externos y de Supabase
    formato.ts      todos los formateadores es-AR
  components/       ui (shadcn) · layout · charts · tabla · una carpeta por pantalla
  pages/            una por ruta
supabase/migrations/  SQL numerado
scripts/            seed, migraciones, tipos y descarga de series macro
```

---

## Decisiones de diseño

### La plata es entera y con moneda

Todo importe se guarda y se opera como **entero de centavos** (`bigint` en Postgres), y
nunca existe sin su columna de moneda al lado. `0.1 + 0.2 !== 0.3`: sobre 1.400 facturas
el error de punto flotante se acumula y el total del dashboard deja de coincidir con la
suma del detalle.

El redondeo ocurre **una sola vez**, al presentar. Redondear en cada paso intermedio y
sumar después da un total distinto que sumar y redondear una vez — y esa diferencia se
midió: 11 centavos sobre las 137 facturas en dólares.

### Ninguna cifra ambigua

Todo valor en pantalla dice si es **nominal**, **real** (y de qué mes base) o **USD MEP**.
La etiqueta va visible en el eje, la leyenda, el tooltip o al lado del KPI. El color no
cuenta como etiqueta: en los gráficos, nominal va en línea sólida y real en punteada, para
que se distingan sin depender del color.

### Una sola fórmula por métrica

`.claude/skills/metricas-financieras/SKILL.md` es la fuente de verdad. Cada métrica está
ahí con su fórmula, su firma TypeScript y **un caso resuelto a mano** con el número exacto.
Ninguna pantalla puede calcular distinto: si hace falta otra cuenta, se corrige el skill.

Todo cálculo vive en `src/lib/metricas/`, en funciones **puras** que no hacen fetch ni
leen la hora del sistema —si necesitan "hoy", lo reciben como parámetro—. Los componentes
reciben números ya calculados.

### Los datos macro son reales; solo lo comercial es ficticio

`ipc_mensual` y `tipo_cambio` se siembran con datos **reales**: el IPC del INDEC y las
cotizaciones históricas de MEP, CCL, oficial, blue, tarjeta y mayorista. Se bajan una vez
y se congelan en `scripts/datos-macro.json` para que el seed sea determinista y funcione
sin internet.

La consigna pedía 90 días de cotizaciones y se cargaron **36 meses**, a propósito: una
factura en dólares de marzo 2024 se normaliza con el MEP de marzo 2024, no con el de hoy.
Con 90 días, toda conversión histórica usaría la cotización actual y el valor real saldría
mal en cada fila.

### Los datos fake tienen que resistir una mirada de cerca

Montos log-normales (pocas cuentas grandes, muchas chicas), ticket correlacionado con
sector y tamaño, coherencia temporal estricta, **cero facturas huérfanas**, mora
concentrada en pocas cuentas y estacionalidad argentina —enero al 40%, segunda quincena de
julio al 60%—.

Tres **cuentas ancla** pesan 24%, 22,5% y 21% de la facturación, con una sola de ellas
morosa: eso lleva el HHI a 1.563 (concentración moderada) y hace que el KPI de
concentración, el score de riesgo y el top-10 cuenten la misma historia.

### Seguridad: RLS en las diez tablas

Todas las tablas salen con RLS habilitada **en la misma migración que las crea**: no hay
una ventana en la que existan desprotegidas. Las 18 políticas llevan `to authenticated`
explícito —una política sin `to` alcanzaría también a `anon`—, no hay ninguna de `delete`,
y `anon` no tiene ni un permiso.

Además de RLS, se revocan los grants SQL y se re-otorga solo lo mínimo: dos puertas, no
una.

Con la publishable key embebida en el bundle, cualquiera puede pegarle a la API REST desde
la consola del navegador. **RLS es lo único que separa "usuario logueado" de "internet".**

### La integridad se declara en la base

`num_nonnulls(contrato_id, oportunidad_id) = 1` en `facturas` hace que "no existe factura
huérfana" sea una regla de Postgres y no una promesa del seed. Hay 24 `check` constraints
más, y dos triggers sobre `cobros` —uno por sentencia, con transition table, porque el
trigger por fila no ve las filas anteriores de su propia sentencia y en un insert en lote
dos cobros parciales excesivos pasarían—.

### El estado de las facturas se deriva, no se congela

`facturas.estado` es una foto del momento del seed y se desfasa a razón de una factura por
día. La vista `v_saldo_facturas` expone **`estado_vigente`**, recalculado contra
`current_date`, y es lo que muestra la UI. Sin eso, la ficha diría "Pendiente" mientras
cobranzas lista la misma factura como vencida.

### El API externo nunca rompe la app

Las cotizaciones se piden en vivo con TanStack Query y se validan con type guards sobre
`unknown` —nunca `as any`—. Cada respuesta exitosa se cachea en `tipo_cambio`. Si el API
no responde, se usa la última cotización cacheada y la UI lo dice con un cartel discreto.
**Nunca se muestra `NaN` ni la app queda rota por un API caído.**

---

## El harness de agentes

El proyecto se construyó con **Claude Opus 5 vía Claude Code**, con un harness propio de
rules, skills y agentes en `.claude/`. No es decorativo: cada fase la ejecutó el agente de
su especialidad y las rules se hicieron cumplir por herramientas.

**Las rules son ejecutables.** oxlint marca `any`, `@ts-ignore` y `console.log` como
`error`, así que `npm run lint` falla de verdad. No son comentarios de buena voluntad.

**Los dos auditores son de solo lectura**, a propósito: quien escribe una fórmula y la
audita después tiende a validar su propia interpretación.

Lo que encontraron, como muestra de que la separación sirvió:

- El `analista-financiero` encontró que `calcularForecast` comparaba timestamps crudos, así
  que una oportunidad que cerraba *hoy* quedaba fuera de su propia ventana en cuanto la
  hora no era medianoche. Los tests pasaban porque usaban medianoche.
- También encontró que `normalizarAArs` devolvía `0` sin cotización en vez de `null`: un
  MEP faltante habría convertido en silencio cada importe en dólares a cero, arrastrando
  MRR, pipeline, aging y HHI sin ningún error visible.
- El `qa-datos` verificó que los diez agregados del dashboard cierran contra el detalle con
  **0 centavos** de diferencia, incluida la partición del aging.
- También detectó que el DSO daba 150-185 días conviviendo con "el 91% cobra dentro de los
  30 días de vencido" —una contradicción—: el generador modelaba la mora como un piso, sin
  ningún pago anticipado. Corregido, el DSO quedó en 83 días y el ECL bajó del 34,7% al
  14,4% del saldo.

El propio skill de métricas recibió correcciones durante la implementación: el caso de
prueba del VAN estaba mal por redondear pasos intermedios —exactamente el error que la
rule de dinero prohíbe—, y la tabla del ECL llamaba "probabilidad de default" a lo que en
realidad son tasas de pérdida.

---

## Licencia

Trabajo académico. Nodus, sus clientes y todos los datos comerciales son ficticios; las
series de inflación y tipo de cambio son reales y de fuentes públicas.
