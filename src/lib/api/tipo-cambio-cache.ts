/**
 * Cache de cotizaciones en la tabla `tipo_cambio`: lectura para el fallback y escritura
 * de cada respuesta exitosa del API.
 *
 * Cuando dolarapi no responde, la app no puede quedarse sin numero ni mostrar `NaN`:
 * lee lo ultimo cacheado y avisa que esta desconectada del mercado. Y cada vez que el API
 * si responde, esa foto se guarda, para que el fallback muestre la ultima cotizacion
 * conocida y no la del ultimo seed.
 *
 * La serie historica la carga `scripts/bajar-macro.ts` con la secret key. El front puede
 * escribir solo sobre esta tabla, y solo `insert`/`update`, por la migracion 0005
 * (rule `supabase.md` §1).
 */

import { format } from 'date-fns'
import type { Cotizacion } from '@/lib/api/dolar'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/supabase'

/** Alcanza con las ultimas filas: son seis casas por dia. */
const FILAS_A_MIRAR = 60

/**
 * Devuelve la cotizacion mas reciente de cada casa. Lanza si Supabase falla, para que el
 * hook distinga "sin datos" de "no pudimos traer los datos".
 */
export async function obtenerCotizacionesCacheadas(): Promise<Cotizacion[]> {
  const { data, error } = await supabase
    .from('tipo_cambio')
    .select('fecha, casa, compra_centavos, venta_centavos')
    .order('fecha', { ascending: false })
    .limit(FILAS_A_MIRAR)

  if (error) throw new Error(`No se pudo leer el cache de tipo_cambio: ${error.message}`)

  const masReciente = new Map<Cotizacion['casa'], Cotizacion>()
  for (const fila of data ?? []) {
    // Vienen ordenadas por fecha descendente: la primera de cada casa es la vigente.
    if (masReciente.has(fila.casa)) continue

    masReciente.set(fila.casa, {
      casa: fila.casa,
      compraCentavos: fila.compra_centavos,
      ventaCentavos: fila.venta_centavos,
      actualizado: new Date(`${fila.fecha}T00:00:00`),
    })
  }

  return [...masReciente.values()]
}

// ---------------------------------------------------------------------------
// Escritura: cachear cada respuesta exitosa del API.
// ---------------------------------------------------------------------------

/**
 * La columna `fecha` es un `date` sin zona horaria, igual que la del seed. Se arma con la
 * fecha local del navegador (Argentina) y no con `toISOString()`, que a la noche devuelve
 * el dia siguiente en UTC y partiria la serie en dos filas por casa.
 */
function aFechaLocal(momento: Date): string {
  return format(momento, 'yyyy-MM-dd')
}

/**
 * Guarda en `tipo_cambio` la foto que acaba de devolver el API.
 *
 * El `unique (fecha, casa)` mas el `onConflict` hacen la operacion idempotente: refrescar
 * diez veces en un dia deja una sola fila por casa, con el ultimo valor.
 *
 * Lanza si Supabase rechaza la escritura. Quien llama decide que hacer con eso: es cache,
 * no camino critico, y una falla acá no puede dejar a la pantalla sin cotizacion.
 */
export async function cachearCotizaciones(cotizaciones: Cotizacion[]): Promise<number> {
  const porClave = new Map<string, TablesInsert<'tipo_cambio'>>()

  for (const cotizacion of cotizaciones) {
    // La tabla exige importes positivos y venta >= compra. Una casa que no cumpla se
    // saltea en vez de hacer fallar el lote entero: el cache es best-effort.
    if (cotizacion.compraCentavos <= 0) continue
    if (cotizacion.ventaCentavos < cotizacion.compraCentavos) continue

    const fecha = aFechaLocal(cotizacion.actualizado)
    // Dos filas con la misma (fecha, casa) en un mismo upsert rompen el ON CONFLICT.
    porClave.set(`${fecha}|${cotizacion.casa}`, {
      fecha,
      casa: cotizacion.casa,
      compra_centavos: cotizacion.compraCentavos,
      venta_centavos: cotizacion.ventaCentavos,
    })
  }

  const filas = [...porClave.values()]
  if (filas.length === 0) return 0

  const { error } = await supabase
    .from('tipo_cambio')
    .upsert(filas, { onConflict: 'fecha,casa' })

  if (error) throw new Error(`No se pudo cachear el tipo de cambio: ${error.message}`)

  return filas.length
}
