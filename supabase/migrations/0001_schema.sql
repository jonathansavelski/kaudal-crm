-- ============================================================================
-- Kaudal CRM - 0001_schema
-- Tipos enum, tablas, claves foraneas, indices y constraints de dominio.
--
-- Contexto: Nodus vende un SaaS B2B de gestion logistica. Factura de dos
-- formas: abono mensual (contratos -> MRR) y proyectos de implementacion
-- por hitos (oportunidades ganadas). Toda la plata se guarda como bigint de
-- centavos con su moneda al lado (rule dinero.md). Los estados son enum de
-- Postgres, no texto libre (rule supabase.md).
--
-- La migracion es re-ejecutable sobre un proyecto limpio: los tipos se crean
-- con guarda y las tablas con "if not exists".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos enum
-- ---------------------------------------------------------------------------

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'moneda' and n.nspname = 'public') then
    -- Nodus solo opera en pesos y dolares. Toda columna de importe apunta a una de estas.
    create type public.moneda as enum ('ARS', 'USD');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tamanio_empresa' and n.nspname = 'public') then
    -- Gobierna el multiplicador de abono del seed y el filtro de /cuentas.
    create type public.tamanio_empresa as enum ('micro', 'pyme', 'corporativa');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'sector_empresa' and n.nspname = 'public') then
    -- Sectores de la cartera de Nodus. Los intensivos en logistica pagan mas abono.
    create type public.sector_empresa as enum (
      'transporte_y_logistica',
      'distribucion_mayorista',
      'retail',
      'agro',
      'alimentos_y_bebidas',
      'manufactura',
      'construccion',
      'salud',
      'servicios_profesionales',
      'software_y_tecnologia'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_comercial' and n.nspname = 'public') then
    -- Embudo de cuenta: prospecto -> potencial -> conversaciones_avanzadas -> cliente -> ex_cliente.
    create type public.estado_comercial as enum (
      'prospecto',
      'potencial',
      'conversaciones_avanzadas',
      'cliente',
      'ex_cliente'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'etapa_oportunidad' and n.nspname = 'public') then
    -- Etapas del pipeline. La probabilidad de cada una la fija el skill metricas-financieras.
    create type public.etapa_oportunidad as enum (
      'prospecto',
      'calificado',
      'demo',
      'propuesta',
      'negociacion',
      'ganada',
      'perdida'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tipo_oportunidad' and n.nspname = 'public') then
    -- implementacion: proyecto one-shot facturado por hitos 30/40/30.
    -- expansion: sube el abono de un contrato existente, no genera factura propia.
    create type public.tipo_oportunidad as enum ('implementacion', 'expansion');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'canal_comercial' and n.nspname = 'public') then
    -- Canal de adquisicion. Lo comparten campanias.canal y oportunidades.origen
    -- justamente para que el CAC por canal (costo del canal / clientes nuevos
    -- atribuidos al canal) sea calculable sin una tabla de mapeo intermedia.
    create type public.canal_comercial as enum (
      'email',
      'eventos',
      'linkedin',
      'google_ads',
      'contenido',
      'referidos',
      'telemarketing',
      'partners'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tipo_accion' and n.nspname = 'public') then
    create type public.tipo_accion as enum (
      'email',
      'evento',
      'demo',
      'videollamada',
      'llamada',
      'visita'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'resultado_accion' and n.nspname = 'public') then
    create type public.resultado_accion as enum (
      'positivo',
      'neutro',
      'negativo',
      'sin_respuesta'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_contrato' and n.nspname = 'public') then
    create type public.estado_contrato as enum ('activo', 'pausado', 'cancelado');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'motivo_baja' and n.nspname = 'public') then
    -- Correlaciona con el perfil de pago del cliente (skill seed-financiero):
    -- los morosos se van por impago/reestructuracion, los sanos por competencia o cierre.
    create type public.motivo_baja as enum (
      'impago',
      'reestructuracion',
      'cambio_de_proveedor',
      'cierre_de_operacion'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_factura' and n.nspname = 'public') then
    create type public.estado_factura as enum (
      'pendiente',
      'parcial',
      'pagada',
      'vencida',
      'incobrable'
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'medio_cobro' and n.nspname = 'public') then
    create type public.medio_cobro as enum ('transferencia', 'cheque', 'echeq', 'debito');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'casa_cambio' and n.nspname = 'public') then
    -- Seis casas: las cuatro de la consigna mas 'tarjeta' y 'mayorista', que la
    -- pantalla /mercado muestra y que el fallback offline necesita tener cacheadas.
    create type public.casa_cambio as enum ('oficial', 'mep', 'ccl', 'blue', 'tarjeta', 'mayorista');
  end if;
end $do$;

-- ---------------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------------

-- empresas: la cuenta comercial. Es el nodo raiz del modelo; contactos,
-- oportunidades, contratos, facturas y acciones cuelgan de aca.
create table if not exists public.empresas (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  cuit              text not null,
  sector            public.sector_empresa not null,
  tamanio           public.tamanio_empresa not null,
  estado_comercial  public.estado_comercial not null default 'prospecto',
  moneda_contrato   public.moneda not null default 'ARS',
  fecha_alta        date not null,
  owner_comercial   text not null,
  ciudad            text not null,
  provincia         text not null,
  created_at        timestamptz not null default now(),
  constraint empresas_cuit_unico unique (cuit),
  -- CUIT: 11 digitos sin guiones. El digito verificador lo calcula el seed;
  -- aca se garantiza al menos el formato.
  constraint empresas_cuit_formato check (cuit ~ '^[0-9]{11}$'),
  constraint empresas_razon_social_no_vacia check (length(btrim(razon_social)) > 0),
  -- Cota inferior de cordura: Nodus no tenia cartera antes de 2015.
  constraint empresas_fecha_alta_plausible check (fecha_alta >= date '2015-01-01')
);

comment on table public.empresas is 'Cuentas del CRM de Nodus: clientes, prospectos y ex clientes.';
comment on column public.empresas.moneda_contrato is 'Moneda en la que se pacta el abono de la cuenta. Sus contratos y facturas la respetan.';
comment on column public.empresas.owner_comercial is 'Vendedor de Nodus a cargo de la cuenta. Filtro de /pipeline y /cuentas.';

-- contactos: personas dentro de la cuenta. es_decisor marca a quien firma.
create table if not exists public.contactos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete restrict,
  nombre      text not null,
  apellido    text not null,
  cargo       text not null,
  email       text not null,
  telefono    text not null,
  es_decisor  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint contactos_email_formato check (email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][a-z]{2,}$')
);

comment on table public.contactos is 'Personas de contacto de cada cuenta. Solo una parte son decisores de compra.';

-- oportunidades: negocio en curso o cerrado. Las de tipo implementacion generan
-- facturas por hito; las de tipo expansion suben el abono del contrato vigente.
create table if not exists public.oportunidades (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references public.empresas (id) on delete restrict,
  titulo                 text not null,
  monto_centavos         bigint not null,
  moneda                 public.moneda not null,
  etapa                  public.etapa_oportunidad not null,
  probabilidad           numeric(4, 3) not null,
  fecha_creacion         date not null,
  fecha_cierre_estimada  date not null,
  fecha_cierre_real      date,
  origen                 public.canal_comercial not null,
  tipo                   public.tipo_oportunidad not null,
  created_at             timestamptz not null default now(),
  constraint oportunidades_monto_positivo check (monto_centavos > 0),
  constraint oportunidades_cierre_estimado_posterior check (fecha_cierre_estimada >= fecha_creacion),
  constraint oportunidades_cierre_real_posterior check (fecha_cierre_real is null or fecha_cierre_real >= fecha_creacion),
  -- Una oportunidad esta cerrada si y solo si tiene fecha de cierre real.
  constraint oportunidades_cierre_coherente check (
    (etapa in ('ganada', 'perdida')) = (fecha_cierre_real is not null)
  ),
  -- La probabilidad se deriva de la etapa (skill metricas-financieras). El check
  -- impide que una fila cargada a mano contradiga la tabla canonica.
  constraint oportunidades_probabilidad_de_etapa check (
    probabilidad = case etapa
      when 'prospecto'   then 0.05
      when 'calificado'  then 0.15
      when 'demo'        then 0.30
      when 'propuesta'   then 0.50
      when 'negociacion' then 0.75
      when 'ganada'      then 1.00
      when 'perdida'     then 0.00
    end
  )
);

comment on table public.oportunidades is 'Pipeline comercial. tipo=implementacion factura por hitos 30/40/30; tipo=expansion sube el abono del contrato.';
comment on column public.oportunidades.monto_centavos is 'implementacion: valor total del proyecto. expansion: incremento mensual ANUALIZADO (delta mensual x 12), para que sea comparable con una implementacion dentro del mismo pipeline.';
comment on column public.oportunidades.probabilidad is 'Derivada de la etapa. Fuente unica: skill metricas-financieras.';

-- campanias: inversion de marketing por canal. Denominador del CAC.
create table if not exists public.campanias (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null,
  canal                 public.canal_comercial not null,
  presupuesto_centavos  bigint not null,
  moneda                public.moneda not null default 'ARS',
  fecha_inicio          date not null,
  fecha_fin             date not null,
  created_at            timestamptz not null default now(),
  constraint campanias_presupuesto_positivo check (presupuesto_centavos > 0),
  constraint campanias_fin_posterior check (fecha_fin >= fecha_inicio)
);

comment on table public.campanias is 'Campanias de marketing. Su canal se cruza con oportunidades.origen para calcular el CAC.';

-- acciones_comerciales: el timeline de la cuenta. Cada toque tiene costo, y ese
-- costo es el numerador del CAC del canal de su campania.
create table if not exists public.acciones_comerciales (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete restrict,
  contacto_id     uuid references public.contactos (id) on delete restrict,
  oportunidad_id  uuid references public.oportunidades (id) on delete restrict,
  campania_id     uuid references public.campanias (id) on delete restrict,
  tipo            public.tipo_accion not null,
  fecha           date not null,
  costo_centavos  bigint not null default 0,
  moneda          public.moneda not null default 'ARS',
  resultado       public.resultado_accion not null,
  notas           text,
  created_at      timestamptz not null default now(),
  -- Una accion puede no costar nada (un mail), pero nunca costar negativo.
  constraint acciones_costo_no_negativo check (costo_centavos >= 0)
);

comment on table public.acciones_comerciales is 'Toques comerciales: mails, llamadas, demos, visitas, eventos. Alimentan el timeline de /cuentas/:id y el CAC.';
comment on column public.acciones_comerciales.moneda is 'Moneda del costo. Existe porque la rule dinero.md prohibe un importe sin su moneda al lado.';

-- contratos: la suscripcion. Genera una factura de abono por mes de vigencia.
create table if not exists public.contratos (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references public.empresas (id) on delete restrict,
  abono_mensual_centavos  bigint not null,
  moneda                  public.moneda not null,
  fecha_inicio            date not null,
  fecha_fin               date,
  estado                  public.estado_contrato not null default 'activo',
  motivo_baja             public.motivo_baja,
  created_at              timestamptz not null default now(),
  constraint contratos_abono_positivo check (abono_mensual_centavos > 0),
  constraint contratos_fin_posterior check (fecha_fin is null or fecha_fin >= fecha_inicio),
  -- Un contrato cancelado tiene si o si fecha de baja y motivo; uno vigente no tiene motivo.
  constraint contratos_baja_coherente check (
    (estado = 'cancelado' and motivo_baja is not null and fecha_fin is not null)
    or (estado <> 'cancelado' and motivo_baja is null)
  )
);

comment on table public.contratos is 'Suscripciones de abono mensual. La suma de abonos de los contratos activos es el MRR actual.';
comment on column public.contratos.abono_mensual_centavos is 'Abono VIGENTE HOY. El historico no se guarda aca: se lee de las facturas de abono mes a mes, que es lo que hace auditables la expansion y la contraccion del NRR.';

-- facturas: el hecho economico. Nace de un contrato (abono mensual) o de una
-- oportunidad de implementacion ganada (hito). Nunca de la nada.
create table if not exists public.facturas (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas (id) on delete restrict,
  contrato_id        uuid references public.contratos (id) on delete restrict,
  oportunidad_id     uuid references public.oportunidades (id) on delete restrict,
  numero             text not null,
  fecha_emision      date not null,
  fecha_vencimiento  date not null,
  monto_centavos     bigint not null,
  moneda             public.moneda not null,
  estado             public.estado_factura not null default 'pendiente',
  created_at         timestamptz not null default now(),
  constraint facturas_numero_unico unique (numero),
  constraint facturas_monto_positivo check (monto_centavos > 0),
  constraint facturas_vencimiento_posterior check (fecha_vencimiento >= fecha_emision),
  -- "No existe factura huerfana" (skill seed-financiero), declarado en la base:
  -- exactamente uno de los dos origenes tiene que estar cargado.
  constraint facturas_origen_unico check (num_nonnulls(contrato_id, oportunidad_id) = 1)
);

comment on table public.facturas is 'Facturas emitidas por Nodus. Origen: contrato (abono mensual) u oportunidad de implementacion ganada (hito 30/40/30).';
comment on column public.facturas.estado is 'pendiente: sin cobros y no vencida. parcial: cobrada en parte. pagada: saldo cero. vencida: sin cobros y pasada de fecha. incobrable: dada por perdida.';

-- cobros: aplicaciones de pago contra una factura. Puede haber varios parciales.
create table if not exists public.cobros (
  id              uuid primary key default gen_random_uuid(),
  factura_id      uuid not null references public.facturas (id) on delete cascade,
  fecha           date not null,
  monto_centavos  bigint not null,
  moneda          public.moneda not null,
  medio           public.medio_cobro not null,
  created_at      timestamptz not null default now(),
  constraint cobros_monto_positivo check (monto_centavos > 0)
);

comment on table public.cobros is 'Cobros aplicados a facturas. on delete cascade: un cobro no tiene sentido sin su factura.';

-- tipo_cambio: cache de cotizaciones. Se siembra con la serie historica real y
-- el front la refresca con el API en vivo. Es la fuente del fallback offline.
create table if not exists public.tipo_cambio (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null,
  casa             public.casa_cambio not null,
  compra_centavos  bigint not null,
  venta_centavos   bigint not null,
  created_at       timestamptz not null default now(),
  constraint tipo_cambio_fecha_casa_unico unique (fecha, casa),
  constraint tipo_cambio_valores_positivos check (compra_centavos > 0 and venta_centavos > 0),
  constraint tipo_cambio_spread_valido check (venta_centavos >= compra_centavos)
);

comment on table public.tipo_cambio is 'Cotizaciones diarias por casa. La normalizacion USD->ARS usa siempre MEP venta de la fecha del hecho economico.';

-- ipc_mensual: serie de inflacion. Base de todo calculo de valor real.
create table if not exists public.ipc_mensual (
  id                 uuid primary key default gen_random_uuid(),
  periodo            date not null,
  indice             numeric(16, 6) not null,
  variacion_mensual  numeric(8, 5) not null,
  created_at         timestamptz not null default now(),
  constraint ipc_periodo_unico unique (periodo),
  -- El periodo es siempre el primer dia del mes: si no, dos filas del mismo mes
  -- pasarian el unique y el deflactado quedaria ambiguo.
  constraint ipc_periodo_primer_dia check (extract(day from periodo) = 1),
  constraint ipc_indice_positivo check (indice > 0),
  -- Deflacion severa o hiperinflacion mensual de tres digitos: dato erroneo.
  constraint ipc_variacion_plausible check (variacion_mensual > -0.5 and variacion_mensual < 1)
);

comment on table public.ipc_mensual is 'Indice de precios mensual (INDEC via argentinadatos). indice base 100 en el primer periodo de la serie.';
comment on column public.ipc_mensual.variacion_mensual is 'Fraccion decimal, no porcentaje: 0.021 = 2,1% mensual. Consistente con indice[n] = indice[n-1] * (1 + variacion[n]).';

-- ---------------------------------------------------------------------------
-- 2.b RLS: se prende aca, en la misma migracion que crea las tablas.
--     Una tabla con RLS habilitada y sin politicas no devuelve ninguna fila:
--     ese es el default seguro. Las politicas que abren lo minimo van en
--     0002_rls.sql. Asi no existe ningun momento en el que una tabla este
--     creada y expuesta sin RLS.
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
-- 3. Indices
--    Uno por cada FK (Postgres no los crea solo) mas los que piden las pantallas.
-- ---------------------------------------------------------------------------

-- /cuentas filtra por estado comercial y el dashboard cuenta clientes activos.
create index if not exists idx_empresas_estado_comercial on public.empresas (estado_comercial);
-- Facturacion por sector para el HHI y la torta del dashboard.
create index if not exists idx_empresas_sector on public.empresas (sector);

-- Ficha de cuenta: contactos de la empresa.
create index if not exists idx_contactos_empresa on public.contactos (empresa_id);

-- Ficha de cuenta y atribucion de oportunidades.
create index if not exists idx_oportunidades_empresa on public.oportunidades (empresa_id);
-- /pipeline agrupa por etapa; el embudo lee solo las abiertas.
create index if not exists idx_oportunidades_etapa on public.oportunidades (etapa);
-- Forecast a 3 y 6 meses: ventana sobre la fecha de cierre estimada de las abiertas.
create index if not exists idx_oportunidades_cierre_estimada on public.oportunidades (fecha_cierre_estimada);

-- Timeline de /cuentas/:id y filtros de /acciones.
create index if not exists idx_acciones_empresa on public.acciones_comerciales (empresa_id);
create index if not exists idx_acciones_contacto on public.acciones_comerciales (contacto_id);
create index if not exists idx_acciones_oportunidad on public.acciones_comerciales (oportunidad_id);
-- CAC por canal: suma de costos agrupada por campania.
create index if not exists idx_acciones_campania on public.acciones_comerciales (campania_id);
-- El timeline se lee siempre del mas nuevo al mas viejo.
create index if not exists idx_acciones_fecha on public.acciones_comerciales (fecha desc);

-- MRR: contratos activos, y contratos de una empresa en su ficha.
create index if not exists idx_contratos_empresa on public.contratos (empresa_id);
create index if not exists idx_contratos_estado on public.contratos (estado);

create index if not exists idx_facturas_empresa on public.facturas (empresa_id);
create index if not exists idx_facturas_contrato on public.facturas (contrato_id);
create index if not exists idx_facturas_oportunidad on public.facturas (oportunidad_id);
-- El indice que pide /cobranzas: el aging y las vencidas filtran por este par exacto.
create index if not exists idx_facturas_vencimiento_estado on public.facturas (fecha_vencimiento, estado);
-- Series mensuales de facturacion (dashboard, 24 meses).
create index if not exists idx_facturas_emision on public.facturas (fecha_emision);

create index if not exists idx_cobros_factura on public.cobros (factura_id);
-- DSO y evolucion de cobranzas por periodo.
create index if not exists idx_cobros_fecha on public.cobros (fecha);

-- "Ultima cotizacion disponible hacia atras" para una casa y una fecha: con este
-- indice ese lookup es un salto al indice y no un scan de 6500 filas.
create index if not exists idx_tipo_cambio_casa_fecha on public.tipo_cambio (casa, fecha desc);

-- Deflactado: el unique ya resuelve la busqueda por periodo exacto; el orden
-- descendente sirve para "ultimo mes disponible", que usan las facturas abiertas.
create index if not exists idx_ipc_periodo on public.ipc_mensual (periodo desc);

-- ---------------------------------------------------------------------------
-- 4. Integridad cruzada de cobros
--    Un check no puede mirar otra tabla, asi que las tres reglas duras que
--    relacionan un cobro con su factura van en un trigger.
-- ---------------------------------------------------------------------------

create or replace function public.fn_validar_cobro()
returns trigger
language plpgsql
as $fn$
declare
  v_factura     public.facturas%rowtype;
  v_ya_cobrado  bigint;
begin
  select * into v_factura from public.facturas where id = new.factura_id;

  if v_factura.moneda <> new.moneda then
    raise exception 'Cobro en % sobre la factura % emitida en %: la moneda del cobro tiene que ser la de la factura',
      new.moneda, v_factura.numero, v_factura.moneda;
  end if;

  if new.fecha < v_factura.fecha_emision then
    raise exception 'Cobro del % anterior a la emision de la factura % (%)',
      new.fecha, v_factura.numero, v_factura.fecha_emision;
  end if;

  select coalesce(sum(monto_centavos), 0) into v_ya_cobrado
  from public.cobros
  where factura_id = new.factura_id
    and id <> new.id;

  if v_ya_cobrado + new.monto_centavos > v_factura.monto_centavos then
    raise exception 'Los cobros de la factura % suman % centavos sobre un monto de %',
      v_factura.numero, v_ya_cobrado + new.monto_centavos, v_factura.monto_centavos;
  end if;

  return new;
end;
$fn$;

comment on function public.fn_validar_cobro() is 'Cobro >= emision, misma moneda que la factura y suma de cobros <= monto. Reglas duras del dominio, en la base y no en el cliente.';

drop trigger if exists trg_validar_cobro on public.cobros;
create trigger trg_validar_cobro
  before insert or update on public.cobros
  for each row execute function public.fn_validar_cobro();

-- El trigger de fila no alcanza para una insercion en lote: dentro de una misma
-- sentencia, una fila no ve a las anteriores de esa sentencia, asi que dos
-- cobros parciales que juntos se pasan del monto pasarian los dos. Este trigger
-- de sentencia mira el total ya consolidado usando la tabla de transicion.
create or replace function public.fn_validar_totales_cobrados()
returns trigger
language plpgsql
as $fn$
declare
  v_numero  text;
  v_total   bigint;
  v_monto   bigint;
begin
  select f.numero, sum(c.monto_centavos), f.monto_centavos
    into v_numero, v_total, v_monto
  from public.facturas f
  join public.cobros c on c.factura_id = f.id
  where f.id in (select factura_id from nuevas)
  group by f.id, f.numero, f.monto_centavos
  having sum(c.monto_centavos) > f.monto_centavos
  limit 1;

  if found then
    raise exception 'Los cobros de la factura % suman % centavos sobre un monto de %',
      v_numero, v_total, v_monto;
  end if;

  return null;
end;
$fn$;

comment on function public.fn_validar_totales_cobrados() is 'Verifica, por sentencia, que ninguna factura tocada haya quedado sobrecobrada. Cubre el caso de las inserciones en lote del seed.';

-- Un trigger por evento, no "insert or update": Postgres no admite transition
-- tables en un trigger declarado para mas de un evento. Los dos llaman a la
-- misma funcion.
drop trigger if exists trg_validar_totales_cobrados on public.cobros;
drop trigger if exists trg_validar_totales_cobrados_insert on public.cobros;
create trigger trg_validar_totales_cobrados_insert
  after insert on public.cobros
  referencing new table as nuevas
  for each statement execute function public.fn_validar_totales_cobrados();

drop trigger if exists trg_validar_totales_cobrados_update on public.cobros;
create trigger trg_validar_totales_cobrados_update
  after update on public.cobros
  referencing new table as nuevas
  for each statement execute function public.fn_validar_totales_cobrados();
