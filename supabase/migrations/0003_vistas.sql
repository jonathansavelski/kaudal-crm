-- ============================================================================
-- Kaudal CRM - 0003_vistas
-- v_saldo_facturas: saldo pendiente y mora por factura.
--
-- El saldo se calcula una sola vez y en un solo lugar: aca. La capa TS
-- (src/lib/metricas/cobranzas.ts) lo consume, no lo recalcula. Si cada pantalla
-- restara los cobros por su cuenta, el aging y el VAN empezarian a diferir
-- entre si por un centavo y no habria forma de auditar cual esta bien.
--
-- security_invoker = on: la vista se ejecuta con los permisos y las politicas
-- RLS del que consulta, no con las del dueno. Sin esto, la vista seria un
-- agujero por el que se leen facturas salteando RLS.
--
-- Re-ejecutable: se dropea antes de crear, porque "create or replace view"
-- falla si cambia la lista de columnas.
-- ============================================================================

drop view if exists public.v_saldo_facturas;

create view public.v_saldo_facturas
with (security_invoker = on)
as
select
  f.id                as factura_id,
  f.empresa_id,
  f.contrato_id,
  f.oportunidad_id,
  f.numero,
  f.fecha_emision,
  f.fecha_vencimiento,
  f.monto_centavos,
  f.moneda,
  f.estado,

  -- Cobros aplicados. El trigger fn_validar_cobro garantiza que nunca superen
  -- el monto, asi que el saldo nunca es negativo.
  coalesce(c.cobrado_centavos, 0)                          as cobrado_centavos,
  f.monto_centavos - coalesce(c.cobrado_centavos, 0)       as saldo_centavos,
  coalesce(c.cantidad_cobros, 0)                           as cantidad_cobros,
  c.fecha_ultimo_cobro,

  -- Mora ABIERTA al dia de hoy: dias corridos desde el vencimiento mientras
  -- quede saldo. Es la que alimenta los buckets del aging de /cobranzas.
  case
    when f.monto_centavos - coalesce(c.cobrado_centavos, 0) > 0
     and f.fecha_vencimiento < current_date
    then (current_date - f.fecha_vencimiento)
    else 0
  end                                                      as dias_mora,

  -- Mora CERRADA: con cuantos dias de atraso se termino de cobrar. Es la que
  -- alimenta "dias de mora promedio" y "% pagadas fuera de termino" del score
  -- de riesgo del cliente, que miran historia, no exposicion actual.
  case
    when c.fecha_ultimo_cobro is null then null
    else greatest(0, c.fecha_ultimo_cobro - f.fecha_vencimiento)
  end                                                      as dias_mora_al_cobro,

  -- Bandera barata para el drill-down de cobranzas.
  (f.monto_centavos - coalesce(c.cobrado_centavos, 0) > 0
   and f.fecha_vencimiento < current_date)                 as esta_vencida

from public.facturas f
left join (
  select
    factura_id,
    sum(monto_centavos) as cobrado_centavos,
    count(*)            as cantidad_cobros,
    max(fecha)          as fecha_ultimo_cobro
  from public.cobros
  group by factura_id
) c on c.factura_id = f.id;

comment on view public.v_saldo_facturas is 'Saldo pendiente (monto - cobros aplicados), dias de mora abierta y mora al cobro, por factura. Fuente unica del aging, el DSO, el VAN de cartera y el ECL.';

-- La vista se lee igual que las tablas: solo usuarios autenticados.
revoke all on public.v_saldo_facturas from anon, authenticated;
grant select on public.v_saldo_facturas to authenticated;
