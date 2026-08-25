/**
 * Lecturas de Supabase para las pantallas de Kaudal.
 *
 * Solo traen filas: no calculan nada. El armado de datasets vive en
 * `src/lib/agregados/` y las formulas en `src/lib/metricas/`.
 *
 * PostgREST corta en 1.000 filas por respuesta y la base tiene 1.403 facturas y 1.113
 * cotizaciones por casa: sin paginar, el dashboard mostraria un total corto y creible.
 * Por eso todo pasa por `traerTodo`.
 */

import { supabase } from '@/lib/supabase'

const TAMANIO_PAGINA = 1000

type RespuestaPagina<T> = { data: T[] | null; error: { message: string } | null }

async function traerTodo<T>(
  traerPagina: (desde: number, hasta: number) => PromiseLike<RespuestaPagina<T>>,
  que: string,
): Promise<T[]> {
  const filas: T[] = []

  for (let pagina = 0; ; pagina += 1) {
    const desde = pagina * TAMANIO_PAGINA
    const { data, error } = await traerPagina(desde, desde + TAMANIO_PAGINA - 1)
    if (error) throw new Error(`No pudimos traer ${que}: ${error.message}`)

    const lote = data ?? []
    filas.push(...lote)
    if (lote.length < TAMANIO_PAGINA) return filas
  }
}

// ---------------------------------------------------------------------------
// Facturas: siempre desde la vista, nunca desde la tabla.
// ---------------------------------------------------------------------------

const COLUMNAS_FACTURA =
  'factura_id, empresa_id, fecha_emision, fecha_vencimiento, monto_centavos, moneda, estado_vigente, saldo_centavos, dias_mora, dias_mora_al_cobro'

/**
 * `facturas.estado` es una foto del seed y se desfasa con los dias; `estado_vigente` de
 * `v_saldo_facturas` lo recalcula contra `current_date`. Se usa la vista, siempre.
 */
export async function traerFacturas() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('v_saldo_facturas')
        .select(COLUMNAS_FACTURA)
        .order('fecha_emision', { ascending: true })
        .range(desde, hasta),
    'las facturas',
  )
}

export type FilaFactura = Awaited<ReturnType<typeof traerFacturas>>[number]

export async function traerCobros() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('cobros')
        .select('factura_id, fecha, monto_centavos, moneda')
        .order('fecha', { ascending: true })
        .range(desde, hasta),
    'los cobros',
  )
}

export type FilaCobro = Awaited<ReturnType<typeof traerCobros>>[number]

// ---------------------------------------------------------------------------
// Comercial
// ---------------------------------------------------------------------------

export async function traerEmpresas() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('empresas')
        .select('id, razon_social, sector, tamanio, estado_comercial, fecha_alta, provincia')
        .order('razon_social', { ascending: true })
        .range(desde, hasta),
    'las empresas',
  )
}

export type FilaEmpresa = Awaited<ReturnType<typeof traerEmpresas>>[number]

export async function traerContratos() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('contratos')
        .select('id, empresa_id, abono_mensual_centavos, moneda, estado, fecha_inicio, fecha_fin')
        .order('fecha_inicio', { ascending: true })
        .range(desde, hasta),
    'los contratos',
  )
}

export type FilaContrato = Awaited<ReturnType<typeof traerContratos>>[number]

export async function traerOportunidades() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('oportunidades')
        .select(
          'id, empresa_id, titulo, monto_centavos, moneda, etapa, origen, tipo, fecha_creacion, fecha_cierre_estimada, fecha_cierre_real',
        )
        .order('fecha_creacion', { ascending: true })
        .range(desde, hasta),
    'las oportunidades',
  )
}

export type FilaOportunidad = Awaited<ReturnType<typeof traerOportunidades>>[number]

export async function traerAcciones() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('acciones_comerciales')
        .select('id, empresa_id, campania_id, oportunidad_id, fecha, costo_centavos, moneda')
        .order('fecha', { ascending: true })
        .range(desde, hasta),
    'las acciones comerciales',
  )
}

export type FilaAccion = Awaited<ReturnType<typeof traerAcciones>>[number]

export async function traerCampanias() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('campanias')
        .select('id, nombre, canal, presupuesto_centavos, moneda, fecha_inicio, fecha_fin')
        .order('fecha_inicio', { ascending: true })
        .range(desde, hasta),
    'las campañas',
  )
}

export type FilaCampania = Awaited<ReturnType<typeof traerCampanias>>[number]

// ---------------------------------------------------------------------------
// Macro
// ---------------------------------------------------------------------------

export async function traerIpc() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('ipc_mensual')
        .select('periodo, indice, variacion_mensual')
        .order('periodo', { ascending: true })
        .range(desde, hasta),
    'la serie de IPC',
  )
}

export type FilaIpc = Awaited<ReturnType<typeof traerIpc>>[number]

/** Serie historica del MEP venta: es la que normaliza todo importe en USD a ARS. */
export async function traerMepHistorico() {
  return traerTodo(
    (desde, hasta) =>
      supabase
        .from('tipo_cambio')
        .select('fecha, venta_centavos')
        .eq('casa', 'mep')
        .order('fecha', { ascending: true })
        .range(desde, hasta),
    'la serie del dólar MEP',
  )
}

export type FilaMep = Awaited<ReturnType<typeof traerMepHistorico>>[number]
