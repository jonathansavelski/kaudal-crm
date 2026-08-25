/**
 * Fallback de cotizaciones: la ultima foto guardada en la tabla `tipo_cambio`.
 *
 * Cuando dolarapi no responde, la app no puede quedarse sin numero ni mostrar `NaN`:
 * lee lo ultimo cacheado y avisa que esta desconectada del mercado.
 *
 * La escritura de esa tabla la hace `scripts/bajar-macro.ts` con la secret key: desde el
 * front es de solo lectura por RLS (rule `supabase.md` §1).
 */

import type { Cotizacion } from '@/lib/api/dolar'
import { supabase } from '@/lib/supabase'

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
