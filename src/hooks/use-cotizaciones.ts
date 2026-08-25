/**
 * Cotizaciones para la cinta de la topbar y para el resto de la app.
 *
 * Primero el API en vivo; si no responde, la ultima foto cacheada en Supabase. Si las
 * dos fallan, la query queda en error y la UI muestra el cartel correspondiente: en
 * ningun escenario aparece un `NaN`.
 *
 * Cada respuesta exitosa del API se cachea en `tipo_cambio` (upsert por fecha y casa), que
 * es justamente de donde lee el fallback.
 *
 * El hook se llama `useCotizaciones` y no `usarCotizaciones` porque el prefijo `use` es
 * lo que hace que React (y la regla `rules-of-hooks`) lo reconozca como hook. Es la
 * unica concesion al ingles en los identificadores.
 */

import { useQuery } from '@tanstack/react-query'
import type { CasaCambio, Cotizacion } from '@/lib/api/dolar'
import { obtenerCotizacionesEnVivo } from '@/lib/api/dolar'
import { cachearCotizaciones, obtenerCotizacionesCacheadas } from '@/lib/api/tipo-cambio-cache'

export type OrigenCotizaciones = 'mercado' | 'cache'

export type Cotizaciones = {
  origen: OrigenCotizaciones
  /** Con `noUncheckedIndexedAccess`, buscar una casa que no vino devuelve `undefined`. */
  porCasa: Partial<Record<CasaCambio, Cotizacion>>
  /** Momento del dato: hora del API, o fecha de la fila cacheada. */
  actualizado: Date
}

function indexar(cotizaciones: Cotizacion[], origen: OrigenCotizaciones): Cotizaciones {
  const porCasa: Partial<Record<CasaCambio, Cotizacion>> = {}
  let actualizado = new Date(0)

  for (const cotizacion of cotizaciones) {
    porCasa[cotizacion.casa] = cotizacion
    if (cotizacion.actualizado > actualizado) actualizado = cotizacion.actualizado
  }

  return { origen, porCasa, actualizado }
}

async function traerCotizaciones(): Promise<Cotizaciones> {
  let enVivo: Cotizacion[]

  try {
    enVivo = await obtenerCotizacionesEnVivo()
  } catch {
    // El API caido no es un error de la app: se degrada al cache y se avisa en pantalla.
    return indexar(await obtenerCotizacionesCacheadas(), 'cache')
  }

  // Cachear la respuesta es lo que hace que el fallback muestre la ultima cotizacion
  // conocida y no la del ultimo seed. Va sin `await` y con el error tragado a proposito:
  // es cache, no camino critico. Si Supabase rechaza la escritura, la pantalla igual
  // muestra la cotizacion en vivo que ya tenemos en la mano.
  void cachearCotizaciones(enVivo).catch(() => undefined)

  return indexar(enVivo, 'mercado')
}

export const CLAVE_COTIZACIONES = ['cotizaciones'] as const

export function useCotizaciones() {
  return useQuery({
    queryKey: CLAVE_COTIZACIONES,
    queryFn: traerCotizaciones,
    // Corto a proposito: la consigna pide que refresque con cada F5 y al volver a la pestana.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
