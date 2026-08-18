-- ============================================================================
-- Kaudal CRM - 0002_rls
-- Row Level Security: se re-afirma el enable (ya viene de 0001) y se abren las
-- politicas minimas.
--
-- Modelo (rule supabase.md): Kaudal es mono-tenant, no hay columna de tenant ni
-- ownership por fila. Lo que separa "usuario logueado" de "internet" es esto:
--
--   select          -> authenticated, en las 10 tablas
--   insert/update   -> authenticated, solo en empresas, contactos,
--                      oportunidades y acciones_comerciales
--   delete          -> nadie, ninguna tabla
--   anon            -> nada, ninguna tabla
--
-- Las otras seis tablas (campanias, contratos, facturas, cobros, tipo_cambio,
-- ipc_mensual) son de solo lectura desde el front: las carga el seed o el cache
-- del API, que corren con la Secret key / la conexion directa a Postgres y por
-- lo tanto saltean RLS.
--
-- TODA politica lleva "to authenticated" explicito. Una politica sin "to"
-- alcanza tambien al rol anon, que es justo lo que no queremos: la publishable
-- key viaja en el bundle y cualquiera puede pegarle a la API REST.
--
-- Re-ejecutable: cada create policy va precedido de su drop policy if exists.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Enable (idempotente; ya estaba desde 0001)
-- ---------------------------------------------------------------------------

alter table public.empresas              enable row level security;
alter table public.contactos             enable row level security;
alter table public.oportunidades         enable row level security;
alter table public.campanias             enable row level security;
alter table public.acciones_comerciales  enable row level security;
alter table public.contratos             enable row level security;
alter table public.facturas              enable row level security;
alter table public.cobros                enable row level security;
alter table public.tipo_cambio           enable row level security;
alter table public.ipc_mensual           enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Grants a nivel tabla
--    RLS filtra filas, pero el permiso SQL es la primera puerta. Se le saca
--    todo a anon y se le da a authenticated solo lo que despues habilita una
--    politica. delete no se otorga a nadie: ni permiso ni politica.
-- ---------------------------------------------------------------------------

revoke all on public.empresas             from anon, authenticated;
revoke all on public.contactos            from anon, authenticated;
revoke all on public.oportunidades        from anon, authenticated;
revoke all on public.campanias            from anon, authenticated;
revoke all on public.acciones_comerciales from anon, authenticated;
revoke all on public.contratos            from anon, authenticated;
revoke all on public.facturas             from anon, authenticated;
revoke all on public.cobros               from anon, authenticated;
revoke all on public.tipo_cambio          from anon, authenticated;
revoke all on public.ipc_mensual          from anon, authenticated;

grant select on public.empresas             to authenticated;
grant select on public.contactos            to authenticated;
grant select on public.oportunidades        to authenticated;
grant select on public.campanias            to authenticated;
grant select on public.acciones_comerciales to authenticated;
grant select on public.contratos            to authenticated;
grant select on public.facturas             to authenticated;
grant select on public.cobros               to authenticated;
grant select on public.tipo_cambio          to authenticated;
grant select on public.ipc_mensual          to authenticated;

grant insert, update on public.empresas             to authenticated;
grant insert, update on public.contactos            to authenticated;
grant insert, update on public.oportunidades        to authenticated;
grant insert, update on public.acciones_comerciales to authenticated;

-- ---------------------------------------------------------------------------
-- 2. empresas - lectura para todos los logueados, alta y edicion tambien
--    (/cuentas permite crear una cuenta y cambiarle el estado comercial).
-- ---------------------------------------------------------------------------

drop policy if exists empresas_select_autenticados on public.empresas;
create policy empresas_select_autenticados
  on public.empresas for select
  to authenticated
  using (true);

drop policy if exists empresas_insert_autenticados on public.empresas;
create policy empresas_insert_autenticados
  on public.empresas for insert
  to authenticated
  with check (true);

drop policy if exists empresas_update_autenticados on public.empresas;
create policy empresas_update_autenticados
  on public.empresas for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 3. contactos
-- ---------------------------------------------------------------------------

drop policy if exists contactos_select_autenticados on public.contactos;
create policy contactos_select_autenticados
  on public.contactos for select
  to authenticated
  using (true);

drop policy if exists contactos_insert_autenticados on public.contactos;
create policy contactos_insert_autenticados
  on public.contactos for insert
  to authenticated
  with check (true);

drop policy if exists contactos_update_autenticados on public.contactos;
create policy contactos_update_autenticados
  on public.contactos for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 4. oportunidades
-- ---------------------------------------------------------------------------

drop policy if exists oportunidades_select_autenticados on public.oportunidades;
create policy oportunidades_select_autenticados
  on public.oportunidades for select
  to authenticated
  using (true);

drop policy if exists oportunidades_insert_autenticados on public.oportunidades;
create policy oportunidades_insert_autenticados
  on public.oportunidades for insert
  to authenticated
  with check (true);

drop policy if exists oportunidades_update_autenticados on public.oportunidades;
create policy oportunidades_update_autenticados
  on public.oportunidades for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 5. acciones_comerciales - la unica alta que hace el usuario a diario
-- ---------------------------------------------------------------------------

drop policy if exists acciones_select_autenticados on public.acciones_comerciales;
create policy acciones_select_autenticados
  on public.acciones_comerciales for select
  to authenticated
  using (true);

drop policy if exists acciones_insert_autenticados on public.acciones_comerciales;
create policy acciones_insert_autenticados
  on public.acciones_comerciales for insert
  to authenticated
  with check (true);

drop policy if exists acciones_update_autenticados on public.acciones_comerciales;
create policy acciones_update_autenticados
  on public.acciones_comerciales for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 6. Tablas de solo lectura desde el front
--    campanias, contratos, facturas, cobros, tipo_cambio, ipc_mensual.
--    Sin politica de insert ni de update: la plata no se toca desde la UI.
-- ---------------------------------------------------------------------------

drop policy if exists campanias_select_autenticados on public.campanias;
create policy campanias_select_autenticados
  on public.campanias for select
  to authenticated
  using (true);

drop policy if exists contratos_select_autenticados on public.contratos;
create policy contratos_select_autenticados
  on public.contratos for select
  to authenticated
  using (true);

drop policy if exists facturas_select_autenticados on public.facturas;
create policy facturas_select_autenticados
  on public.facturas for select
  to authenticated
  using (true);

drop policy if exists cobros_select_autenticados on public.cobros;
create policy cobros_select_autenticados
  on public.cobros for select
  to authenticated
  using (true);

drop policy if exists tipo_cambio_select_autenticados on public.tipo_cambio;
create policy tipo_cambio_select_autenticados
  on public.tipo_cambio for select
  to authenticated
  using (true);

drop policy if exists ipc_mensual_select_autenticados on public.ipc_mensual;
create policy ipc_mensual_select_autenticados
  on public.ipc_mensual for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 7. Lo que NO existe, a proposito
--    - Ninguna politica "for delete", en ninguna tabla, para ningun rol.
--    - Ninguna politica "to anon" ni "to public".
--    - Ninguna politica sin "to", que implicitamente alcanzaria a anon.
--    Si alguna vez hace falta borrar, se escribe una migracion nueva que lo
--    diga explicito; no se afloja una politica existente.
-- ---------------------------------------------------------------------------
