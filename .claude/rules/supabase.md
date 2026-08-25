# Rule: supabase

Backend real: Postgres + Auth + RLS. Es un demo, pero se configura como si no lo fuera,
porque el esquema de seguridad es parte de lo que se entrega.

## 1. RLS habilitada en todas las tablas, sin excepción

Cada tabla que se crea sale con `alter table ... enable row level security` en la misma
migración. **No hay tabla sin RLS**, ni siquiera las de cache (`tipo_cambio`,
`ipc_mensual`).

Una tabla con RLS habilitada y sin políticas no devuelve filas. Eso es correcto y es el
default seguro: primero se prende RLS, después se abre lo mínimo.

Kaudal es mono-tenant, así que el modelo es simple:

| Operación | Quién | Sobre qué |
|---|---|---|
| `select` | `authenticated` | Todas las tablas |
| `insert` / `update` | `authenticated` | `empresas`, `contactos`, `oportunidades`, `acciones_comerciales` |
| `delete` | nadie | — |
| cualquiera | `anon` | **nada** |

El resto de las tablas (`facturas`, `cobros`, `contratos`, `campanias`, `ipc_mensual`)
son de solo lectura desde el front: se cargan por seed usando la Secret key.

**Excepción, `tipo_cambio`** (migración `0005`): `authenticated` puede además hacer
`insert` y `update`, y solo ahí. La consigna pide que cada respuesta exitosa del API se
cachee, para que el fallback muestre la última cotización conocida y no la foto del
último seed. El `unique (fecha, casa)` hace el upsert idempotente.

El riesgo que se acepta: un usuario autenticado podría escribir una cotización falsa. En
un demo mono-tenant con un solo usuario es aceptable. Si esto fuera multi-tenant, el
cacheo iría en una edge function con la Secret key, no en el cliente.

Cada política se escribe con `to authenticated` explícito. Una política sin `to` aplica
también a `anon`, que es justo lo que no queremos.

**Por qué mono-tenant no significa sin RLS:** con la `anon key` publicada en el bundle,
cualquiera puede pegarle a la API REST de Supabase desde la consola del navegador. RLS es
lo único que separa "usuario logueado" de "internet".

## 2. Claves

Supabase renombró las claves. El mapeo con la nomenclatura vieja:

| Clave (panel actual) | Antes se llamaba | Variable | Puede ir al repo |
|---|---|---|---|
| **Publishable key** (`sb_publishable_…`) | `anon key` | `VITE_SUPABASE_PUBLISHABLE_KEY` | Sí, es pública por diseño |
| **Secret key** (`sb_secret_…`) | `service_role key` | `SUPABASE_SECRET_KEY` | **Nunca** |

- La **Secret key** saltea RLS. Es la única forma de cargar el seed en las tablas que
  desde el front son de solo lectura, y es exactamente por eso que no puede salir de la
  máquina local.
- La **Secret key** **jamás** lleva el prefijo `VITE_`. Vite embebe en el bundle todo
  lo que empiece con `VITE_`, así que ese prefijo la publicaría.
- La **Secret key** **jamás** se carga como variable de entorno en Netlify. Solo la
  usa `scripts/seed.ts`, que corre en la máquina local.
- `.env` está en `.gitignore` desde el primer commit. Lo versionado es `.env.example` con
  valores de ejemplo.
- Si una clave se filtra, se rota en Supabase. No alcanza con borrar el commit.

## 3. Queries tipadas

Los tipos del esquema se generan y viven en `src/types/supabase.ts`:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts
```

El cliente se instancia con ese tipo, una sola vez, en `src/lib/supabase.ts`:

```ts
export const supabase = createClient<Database>(url, anonKey)
```

Así `supabase.from('facturas').select()` devuelve filas tipadas y `any` no aparece por
la puerta de atrás. Después de cada migración que cambie el esquema, **se regeneran los
tipos** — si no, el tipado miente, que es peor que no tenerlo.

## 4. Migraciones

Todo cambio de esquema va como archivo numerado en `supabase/migrations/`:

```
0001_schema.sql     tipos enum, tablas, FKs, índices
0002_rls.sql        enable row level security + políticas
0003_vistas.sql     v_saldo_facturas
```

- Los archivos son **inmutables una vez aplicados**. Un cambio posterior es una migración
  nueva, nunca una edición del archivo viejo.
- Cada migración es idempotente donde se pueda (`create table if not exists`,
  `drop policy if exists` antes de `create policy`) para poder re-correrla en un proyecto
  limpio.
- Nada de cambios hechos a mano desde el panel de Supabase que no queden en un archivo.
  Si el esquema del proyecto y `supabase/migrations/` divergen, el repo deja de describir
  el sistema.

## 5. Integridad en la base, no en el cliente

Las reglas del dominio se declaran en el esquema, no se confían al front:

- Foreign keys con `on delete restrict`, salvo `cobros -> facturas` que va
  `on delete cascade` (un cobro no tiene sentido sin su factura).
- Índices en **todos** los FK, más `facturas(fecha_vencimiento, estado)` y
  `empresas(estado_comercial)`, que son los que filtran las pantallas de cobranzas y
  cuentas.
- Los estados son `enum` de Postgres, no `text` libre.
- `check` constraints donde haya una regla dura: `monto_centavos > 0`,
  `fecha_vencimiento >= fecha_emision`.

## 6. Auth

- Un solo usuario demo precargado: `demo@demo.com` / `pia2026`.
- Email/password, sin confirmación por mail (es un demo, el corrector tiene que poder
  entrar sin acceso a una casilla).
- La sesión se persiste; el guard de rutas lee la sesión de Supabase, no un flag propio.
- Las credenciales del demo se muestran **como texto de ayuda en la pantalla de login**,
  a propósito, para que el corrector no tenga que buscarlas.
