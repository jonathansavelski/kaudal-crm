/**
 * Contexto macro: las dos tablas de conversion que necesita cualquier cifra de Kaudal.
 *
 *  - IPC mensual, para llevar un nominal a valor real (`deflactar`).
 *  - MEP venta diario, para llevar un importe en USD a ARS (`normalizarAArs`).
 *
 * Este modulo **no calcula ninguna metrica**: solo resuelve "que indice/cotizacion
 * corresponde a esta fecha". Las formulas viven en `src/lib/metricas/`.
 *
 * Regla de resolucion: se toma el ultimo dato **hacia atras**. Un feriado no tiene MEP y
 * agosto 2026 todavia no tiene IPC publicado; en los dos casos vale el ultimo conocido.
 * Si la fecha es anterior al comienzo de la serie no hay nada que tomar y devuelve
 * `null`: convertir con cero seria licuar el importe en silencio.
 */

import type { FilaIpc, FilaMep } from '@/lib/api/consultas'
import type { Importe, Moneda } from '@/lib/metricas/tipos'
import { normalizarAArs } from '@/lib/metricas/moneda'

/** Par ordenado por clave ISO ascendente. */
type Punto = { clave: string; valor: number }

/** Ultimo punto con `clave <= fecha`. Las claves ISO comparan bien lexicograficamente. */
function ultimoHaciaAtras(puntos: readonly Punto[], fecha: string): number | null {
  let bajo = 0
  let alto = puntos.length - 1
  let encontrado: number | null = null

  while (bajo <= alto) {
    const medio = (bajo + alto) >> 1
    const punto = puntos[medio]
    if (!punto) break

    if (punto.clave <= fecha) {
      encontrado = punto.valor
      bajo = medio + 1
    } else {
      alto = medio - 1
    }
  }

  return encontrado
}

export type ContextoMacro = {
  /** Primer dia del ultimo mes con IPC publicado. Es el mes base de todo valor real. */
  mesBase: Date
  indiceBase: number
  /** Indice de IPC del mes de `fechaIso` (o el ultimo anterior). */
  indiceDeFecha: (fechaIso: string) => number | null
  /** MEP venta en centavos del dia de `fechaIso` (o el ultimo anterior). */
  mepVentaDeFecha: (fechaIso: string) => number | null
  /** Ultimo MEP venta conocido, para valuar lo que no tiene fecha de hecho (pipeline). */
  mepUltimoCentavos: number
  fechaMepUltimo: string
  /** Inflacion acumulada de toda la ventana, como fraccion: 4,9 = +490%. */
  inflacionAcumulada: number | null
}

export function armarContextoMacro(ipc: readonly FilaIpc[], mep: readonly FilaMep[]): ContextoMacro {
  const puntosIpc: Punto[] = ipc
    .map((fila) => ({ clave: fila.periodo, valor: fila.indice }))
    .sort((a, b) => a.clave.localeCompare(b.clave))

  const puntosMep: Punto[] = mep
    .map((fila) => ({ clave: fila.fecha, valor: fila.venta_centavos }))
    .sort((a, b) => a.clave.localeCompare(b.clave))

  const primerIpc = puntosIpc[0]
  const ultimoIpc = puntosIpc[puntosIpc.length - 1]
  const ultimoMep = puntosMep[puntosMep.length - 1]

  if (!ultimoIpc || !ultimoMep || !primerIpc) {
    throw new Error('Faltan las series macro (IPC o MEP) para poder convertir importes')
  }

  return {
    mesBase: new Date(`${ultimoIpc.clave}T00:00:00`),
    indiceBase: ultimoIpc.valor,
    indiceDeFecha: (fechaIso) => ultimoHaciaAtras(puntosIpc, fechaIso),
    mepVentaDeFecha: (fechaIso) => ultimoHaciaAtras(puntosMep, fechaIso),
    mepUltimoCentavos: ultimoMep.valor,
    fechaMepUltimo: ultimoMep.clave,
    inflacionAcumulada: primerIpc.valor > 0 ? ultimoIpc.valor / primerIpc.valor - 1 : null,
  }
}

/**
 * Lleva un importe a ARS con el MEP venta **de la fecha del hecho economico**, que es la
 * unica cotizacion honesta: una factura de 2024 en USD no se valua al MEP de hoy.
 */
export function aArs(
  contexto: ContextoMacro,
  centavos: number,
  moneda: Moneda,
  fechaHecho: string,
): number | null {
  const importe: Importe = { centavos, moneda }
  if (moneda === 'ARS') return centavos

  const mep = contexto.mepVentaDeFecha(fechaHecho)
  if (mep === null) return null

  return normalizarAArs(importe, mep)
}

/**
 * Igual que {@link aArs} pero al ultimo MEP: para montos sin fecha de hecho pasada
 * (el pipeline cierra en el futuro). `mepCentavos` deja pisar la cotizacion, que es lo
 * que necesita el simulador de escenarios.
 */
export function aArsHoy(
  contexto: ContextoMacro,
  centavos: number,
  moneda: Moneda,
  mepCentavos?: number,
): number | null {
  return normalizarAArs({ centavos, moneda }, mepCentavos ?? contexto.mepUltimoCentavos)
}
