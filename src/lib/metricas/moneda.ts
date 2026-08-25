/**
 * Conversion de moneda y de valor: ARS <-> USD MEP y nominal <-> real.
 *
 * Es la base de todo el resto del modulo: ninguna metrica suma ARS con USD sin pasar
 * antes por `normalizarAArs`, y ninguna pantalla muestra un valor real sin pasar por
 * `deflactar`.
 *
 * Fuente de verdad: skill `metricas-financieras`.
 */

import type { Importe } from '@/lib/metricas/tipos'

/**
 * Lleva un importe a ARS con la cotizacion MEP **venta** de la fecha del hecho economico.
 *
 *     ars_centavos = usd_centavos x mep_venta_centavos / 100
 *
 * El `/ 100` sale de que la cotizacion tambien viene expresada en centavos.
 * Si el importe ya esta en ARS se devuelve tal cual, sin tocar.
 */
export function normalizarAArs(importe: Importe, mepVentaCentavos: number): number {
  if (importe.moneda === 'ARS') return importe.centavos

  // Unico redondeo, al final: el resultado son centavos y los centavos son enteros.
  return Math.round((importe.centavos * mepVentaCentavos) / 100)
}

/**
 * Lleva un importe nominal a pesos de un mes base.
 *
 *     real = nominal x ipc_base / ipc_origen
 *
 * `ipcOrigen` es el indice del mes del hecho (emision, cobro); `ipcBase` el del mes al
 * que se quiere expresar el importe. Cuando el mes base es mas viejo que el de origen,
 * el resultado es menor que el nominal: eso es exactamente lo que Kaudal quiere mostrar.
 *
 * Devuelve `null` si `ipcOrigen` no es positivo (dato de IPC ausente o roto).
 */
export function deflactar(
  nominalCentavos: number,
  ipcOrigen: number,
  ipcBase: number,
): number | null {
  if (ipcOrigen <= 0) return null

  return Math.round((nominalCentavos * ipcBase) / ipcOrigen)
}

/**
 * Lleva un importe en ARS a USD MEP.
 *
 *     usd_centavos = ars_centavos x 100 / mep_venta_centavos
 *
 * Devuelve `null` si la cotizacion no es positiva: dividir por cero daria `Infinity`,
 * y ninguna pantalla puede mostrar eso.
 */
export function aUsdMep(arsCentavos: number, mepVentaCentavos: number): number | null {
  if (mepVentaCentavos <= 0) return null

  return Math.round((arsCentavos * 100) / mepVentaCentavos)
}
