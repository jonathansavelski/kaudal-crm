-- 0004_estado_vigente.sql
--
-- Problema que resuelve: facturas.estado es un snapshot congelado por el seed.
-- La vista, en cambio, calcula la mora contra current_date. A medida que pasan
-- los dias desde la carga, las dos cosas se separan: una factura sembrada como
-- 'pendiente' con vencimiento a 3 dias hoy ya esta vencida, pero su columna
-- estado sigue diciendo 'pendiente'. El agente qa-datos encontro 5 casos y el
-- desvio crece ~1 factura por dia.
--
-- La UI muestra estado_vigente, no facturas.estado. Asi la ficha, el aging y la
-- pantalla de cobranzas coinciden siempre, sin depender de cuando se corrio el
-- seed.
--
-- Precedencia (la misma que usa el seed y que bucketDeFactura en la capa de
-- metricas): incobrable pisa todo, despues pagada, despues parcial, y recien
-- ahi se mira el vencimiento.

create or replace view public.v_saldo_facturas
with (security_invoker = on) as
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

  coalesce(c.cobrado_centavos, 0)                          as cobrado_centavos,
  f.monto_centavos - coalesce(c.cobrado_centavos, 0)       as saldo_centavos,
  coalesce(c.cantidad_cobros, 0)                           as cantidad_cobros,
  c.fecha_ultimo_cobro,

  -- Mora ABIERTA al dia de hoy: dias corridos desde el vencimiento mientras
  -- quede saldo. Es la que alimenta el aging y el ECL.
  case
    when f.monto_centavos - coalesce(c.cobrado_centavos, 0) <= 0 then 0
    when f.fecha_vencimiento >= current_date then 0
    else (current_date - f.fecha_vencimiento)
  end                                                      as dias_mora,

  -- Mora CERRADA: con cuantos dias de atraso se termino de cobrar. Es la que
  -- alimenta "dias de mora promedio" y "% pagadas fuera de termino" del score
  -- de riesgo del cliente.
  case
    when c.fecha_ultimo_cobro is null then null
    else greatest(0, c.fecha_ultimo_cobro - f.fecha_vencimiento)
  end                                                      as dias_mora_al_cobro,

  (f.monto_centavos - coalesce(c.cobrado_centavos, 0) > 0
   and f.fecha_vencimiento < current_date)                 as esta_vencida,

  -- Estado derivado del saldo y de current_date. Es el que va a pantalla.
  case
    when f.estado = 'incobrable' then 'incobrable'
    when f.monto_centavos - coalesce(c.cobrado_centavos, 0) <= 0 then 'pagada'
    when coalesce(c.cantidad_cobros, 0) > 0 then 'parcial'
    when f.fecha_vencimiento < current_date then 'vencida'
    else 'pendiente'
  end::public.estado_factura                               as estado_vigente

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

comment on view public.v_saldo_facturas is 'Saldo pendiente (monto - cobros aplicados), dias de mora abierta y mora al cobro, y estado_vigente derivado de current_date, por factura. Fuente unica del aging, el DSO, el VAN de cartera y el ECL. La UI muestra estado_vigente, no facturas.estado, que es un snapshot del seed.';

revoke all on public.v_saldo_facturas from anon, authenticated;
grant select on public.v_saldo_facturas to authenticated;
