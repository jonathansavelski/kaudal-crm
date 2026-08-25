-- 0005_cache_tipo_cambio.sql
--
-- La consigna pide que cada respuesta exitosa del API de cotizaciones se cachee
-- en tipo_cambio, para que el fallback muestre la ultima cotizacion conocida y
-- no la del ultimo seed. Eso exige que el front pueda escribir en esa tabla, y
-- hasta ahora era de solo lectura para authenticated.
--
-- Se abre lo minimo indispensable:
--   - insert y update SOLO sobre tipo_cambio, y SOLO para authenticated.
--   - delete sigue sin otorgarse a nadie.
--   - anon sigue sin poder tocar nada.
--   - El resto de las tablas de solo lectura (facturas, cobros, contratos,
--     campanias, ipc_mensual) no cambian.
--
-- El riesgo que se acepta: un usuario autenticado podria escribir una cotizacion
-- falsa. En un demo mono-tenant con un solo usuario es aceptable, y a cambio el
-- fallback deja de mostrar una foto vieja. Si esto fuera multi-tenant, el cacheo
-- iria en una edge function con la secret key, no en el cliente.
--
-- La clave primaria (fecha, casa) hace que el upsert sea idempotente: refrescar
-- diez veces en un dia deja una sola fila por casa.

-- Permiso SQL, que es la primera puerta antes de RLS.
grant insert, update on public.tipo_cambio to authenticated;

drop policy if exists tipo_cambio_insert_autenticados on public.tipo_cambio;
create policy tipo_cambio_insert_autenticados
  on public.tipo_cambio for insert
  to authenticated
  with check (true);

drop policy if exists tipo_cambio_update_autenticados on public.tipo_cambio;
create policy tipo_cambio_update_autenticados
  on public.tipo_cambio for update
  to authenticated
  using (true)
  with check (true);

comment on table public.tipo_cambio is 'Cotizaciones por fecha y casa. Se carga por seed y se refresca desde el front cacheando cada respuesta exitosa del API (migracion 0005). Es la fuente del fallback cuando el API no responde.';
