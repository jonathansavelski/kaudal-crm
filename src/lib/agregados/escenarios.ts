/**
 * Simulador de escenarios de `/mercado`.
 *
 * Dos palancas: un salto del MEP y una inflacion mensual esperada. Con eso se recalcula
 * el valor real de la cartera, el forecast del pipeline y la exposicion cambiaria.
 *
 * **Ninguna formula nueva.** Todo sale de `src/lib/metricas/`:
 * `calcularCaidaPorSaltoMep`, `calcularExposicionCambiaria`, `calcularForecast` y
 * `deflactar`. Aca solo se arman los insumos y se proyecta el indice de precios.
 */

import type { FilaOportunidad } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { normalizarOportunidades } from '@/lib/agregados/comercial'
import { deflactar } from '@/lib/metricas/moneda'
import { calcularForecast } from '@/lib/metricas/pipeline'
import { calcularCaidaPorSaltoMep, calcularExposicionCambiaria } from '@/lib/metricas/riesgo'

/** Base arbitraria para proyectar el IPC: solo importa el cociente entre dos indices. */
const INDICE_HOY = 100

/** Horizonte del forecast, en meses. */
export const HORIZONTES = [3, 6] as const

export type Escenario = {
  /** Fraccion: 0,35 = el MEP salta 35%. */
  saltoMep: number
  /** Fraccion mensual: 0,04 = 4% por mes. */
  inflacionMensual: number
}

export const ESCENARIO_BASE: Escenario = { saltoMep: 0, inflacionMensual: 0 }

export type ResultadoEscenario = {
  carteraNominalCentavos: number
  /** Cartera llevada a poder adquisitivo de hoy, descontando la inflacion del plazo. */
  carteraRealCentavos: number
  perdidaRealCentavos: number
  forecastNominalCentavos: Record<number, number>
  forecastRealCentavos: Record<number, number>
  /** Porcion de la cartera denominada en ARS, sobre el total normalizado. */
  exposicionArs: number | null
  /** Caida del valor en USD de la porcion ARS ante el salto del MEP. */
  caidaPorMep: number | null
  mesesHastaCobro: number
  mepSimuladoCentavos: number
}

export type EntradaEscenario = {
  saldoArsCentavos: number
  saldoUsdNormalizadoCentavos: number
  oportunidades: readonly FilaOportunidad[]
  contexto: ContextoMacro
  hoy: Date
  /** Plazo promedio de cobro, en dias. Sale del DSO de la cartera. */
  diasHastaCobro: number
}

/**
 * Indice de precios proyectado a `meses` vista con una inflacion mensual constante.
 * Se compone: 5% mensual durante 6 meses no es 30%, es 34%.
 */
function indiceProyectado(inflacionMensual: number, meses: number): number {
  return INDICE_HOY * Math.pow(1 + inflacionMensual, meses)
}

/** Lleva un nominal futuro a pesos de hoy con la inflacion esperada del escenario. */
function aPesosDeHoy(nominalCentavos: number, inflacionMensual: number, meses: number): number {
  // `deflactar(nominal, ipcOrigen, ipcBase)` = nominal x ipcBase / ipcOrigen. El origen
  // es el momento del cobro (indice proyectado) y la base es hoy.
  return deflactar(nominalCentavos, indiceProyectado(inflacionMensual, meses), INDICE_HOY) ?? 0
}

export function simularEscenario(
  entrada: EntradaEscenario,
  escenario: Escenario,
): ResultadoEscenario {
  const { saldoArsCentavos, saldoUsdNormalizadoCentavos, contexto, hoy, diasHastaCobro } = entrada

  const mepSimuladoCentavos = Math.round(contexto.mepUltimoCentavos * (1 + escenario.saltoMep))

  // La porcion en USD se revalua con el salto; la porcion en ARS no se mueve en pesos.
  const saldoUsdSimulado = Math.round(saldoUsdNormalizadoCentavos * (1 + escenario.saltoMep))
  const carteraNominalCentavos = saldoArsCentavos + saldoUsdSimulado

  const mesesHastaCobro = Math.max(0, diasHastaCobro / 30)
  const carteraRealCentavos = aPesosDeHoy(
    carteraNominalCentavos,
    escenario.inflacionMensual,
    mesesHastaCobro,
  )

  const oportunidades = normalizarOportunidades(
    entrada.oportunidades,
    contexto,
    mepSimuladoCentavos,
  )

  const forecastNominalCentavos: Record<number, number> = {}
  const forecastRealCentavos: Record<number, number> = {}

  for (const meses of HORIZONTES) {
    const nominal = calcularForecast(oportunidades, hoy, meses)
    forecastNominalCentavos[meses] = nominal
    // Un forecast a 6 meses se cobra, en promedio, a la mitad del horizonte.
    forecastRealCentavos[meses] = aPesosDeHoy(nominal, escenario.inflacionMensual, meses / 2)
  }

  return {
    carteraNominalCentavos,
    carteraRealCentavos,
    perdidaRealCentavos: carteraNominalCentavos - carteraRealCentavos,
    forecastNominalCentavos,
    forecastRealCentavos,
    exposicionArs: calcularExposicionCambiaria(saldoArsCentavos, saldoUsdSimulado),
    caidaPorMep: calcularCaidaPorSaltoMep(escenario.saltoMep),
    mesesHastaCobro,
    mepSimuladoCentavos,
  }
}
