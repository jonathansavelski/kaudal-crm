# Kaudal CRM

CRM comercial interno de **Nodus**, empresa ficticia argentina que vende un SaaS B2B de
gestión logística. Nodus factura de dos formas: **abono mensual** (MRR) y **proyectos de
implementación** por hitos.

Lo que diferencia a Kaudal de un CRM común: no muestra solo plata nominal. Toda cifra
relevante se muestra además **en valor real** (deflactada por IPC) y **en dólar MEP**.
En Argentina un cobro a 90 días vale bastante menos que su valor de factura, y el CRM
existe para hacer visible esa brecha. Cruza gestión comercial con salud financiera de
la cartera.

Trabajo Práctico Integrador — Módulo Finanzas, posgrado en Inteligencia Artificial,
UCEMA 2026. Se entrega publicado en Netlify.

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
| Seed | `@faker-js/faker` locale `es_AR` + `tsx` |
| Tests | Vitest |
| Lint | oxlint |
| Deploy | Netlify (SPA estática) |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo `tsc -b` |
| `npm run lint` | oxlint |
| `npm run test` | Vitest, una pasada |
| `npm run test:watch` | Vitest en watch |
| `npm run seed` | Carga datos fake en Supabase |
| `npm run seed:reset` | Limpia y recarga desde cero |

## Estructura

```
.claude/          harness: rules, skills, agentes
src/
  components/
    ui/           shadcn/ui (vendored, no se edita a mano)
    layout/       shell: sidebar, topbar, footer
    charts/       wrappers de Recharts
  pages/          una por ruta
  lib/
    metricas/     las 17 fórmulas financieras, puras + sus tests
    agregados/    agrupa y normaliza para las pantallas; delega en metricas/
    api/          clientes de los APIs externos y de Supabase
    supabase.ts   cliente tipado
    formato.ts    formateadores es-AR centralizados
  hooks/
  types/
supabase/migrations/   SQL numerado
scripts/seed.ts        generador de datos
```

## Índice del harness

### Rules — `.claude/rules/`

| Rule | De qué manda |
|---|---|
| `dinero.md` | Enteros en centavos, moneda explícita, etiqueta nominal/real/USD |
| `stack.md` | TS estricto, tamaño de componentes, dónde viven los cálculos |
| `supabase.md` | RLS obligatoria, manejo de claves, migraciones |
| `ui.md` | Paginado, estados de carga y vacío, sin emojis, contraste |

### Skills — `.claude/skills/`

| Skill | Para qué |
|---|---|
| `metricas-financieras` | Diccionario canónico de fórmulas. **Fuente de verdad única** |
| `seed-financiero` | Cómo generar datos fake que resistan una mirada de cerca |
| `charts-crm` | Convenciones de Recharts: paleta, ejes, tooltips, vacíos |

### Agentes — `.claude/agents/`

| Agente | Alcance |
|---|---|
| `arquitecto-datos` | Esquema, migraciones SQL, índices, RLS. No toca el front |
| `analista-financiero` | Audita fórmulas contra el skill. Revisa cálculos y tests, no UI |
| `frontend-crm` | Pantallas y componentes, siguiendo `ui.md` y `charts-crm` |
| `qa-datos` | Integridad referencial y que los agregados cuadren con el detalle |

## Reglas transversales

Estas cuatro se aplican siempre, sin excepción. El detalle está en cada rule.

1. **La plata es entera y con moneda.** Nunca `float`, nunca un monto sin su columna de
   moneda al lado. Redondeo solo al mostrar.
2. **Ninguna cifra ambigua.** Todo importe en pantalla dice si es nominal, real o USD MEP.
3. **Una sola fórmula por métrica.** La del skill `metricas-financieras`. Si una pantalla
   necesita calcular distinto, se corrige el skill, no se bifurca el cálculo.
   `src/lib/agregados/` agrupa, filtra y normaliza para las pantallas, pero **no define
   ninguna fórmula**: siempre delega en `src/lib/metricas/`.
4. **RLS en todas las tablas.** La `service_role key` no entra al front ni al repo.

## Contexto de negocio

- **Estados comerciales de una empresa:**
  `prospecto` → `potencial` → `conversaciones_avanzadas` → `cliente` → `ex_cliente`
- **Etapas de una oportunidad:**
  `prospecto` → `calificado` → `demo` → `propuesta` → `negociacion` → `ganada` / `perdida`
- **Tipos de oportunidad:** `implementacion` (one-shot por hitos) y `expansion`
  (sube el abono de un cliente existente).
- Los contratos generan facturas recurrentes; las oportunidades ganadas de tipo
  `implementacion` generan facturas por hito. **No existe factura huérfana.**

## Idioma

Toda la UI en **español rioplatense**. Números y fechas con `es-AR`. El código
(identificadores, nombres de archivo) también en español, sin acentos ni ñ en los
identificadores. Los comentarios explican el *porqué*, no el *qué*.

## LLM

Construido con **Claude Opus 5** vía **Claude Code**.
