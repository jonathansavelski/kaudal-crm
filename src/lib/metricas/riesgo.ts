/**
 * Riesgo de cartera: HHI de concentracion, ECL, exposicion cambiaria y score de riesgo
 * por cliente.
 *
 * Fuente de verdad: skill `metricas-financieras`.
 */

import type {
  Aging,
  BucketAging,
  ComponentesScoreRiesgo,
  LecturaHhi,
} from '@/lib/metricas/tipos'
import { BUCKETS_AGING } from '@/lib/metricas/tipos'

// ---------------------------------------------------------------------------
// HHI de concentracion
// ---------------------------------------------------------------------------

/**
 *     share_i = facturacion_12m_cliente_i / facturacion_12m_total
 *     HHI     = suma( (share_i x 100)^2 )
 *
 * Sobre la facturacion de los ultimos 12 meses, ya normalizada a ARS. El maximo teorico
 * es 10.000 (un solo cliente se lleva todo).
 *
 * Devuelve `null` si la facturacion total es cero.
 */
export function calcularHhi(facturacionPorCliente: readonly number[]): number | null {
  const total = facturacionPorCliente.reduce((acumulado, monto) => acumulado + monto, 0)

  if (total <= 0) return null

  return facturacionPorCliente.reduce((acumulado, monto) => {
    // (monto x 100) / total en vez de (monto / total) x 100: el mismo share, pero sin
    // arrastrar el error del cociente intermedio cuando los montos son enteros grandes.
    const sharePorcentual = (monto * 100) / total
    return acumulado + sharePorcentual * sharePorcentual
  }, 0)
}

/** Lectura cualitativa del HHI, con los cortes que fija el skill. */
export function clasificarHhi(hhi: number): LecturaHhi {
  if (hhi < 1500) return 'diversificada'
  if (hhi <= 2500) return 'moderada'
  return 'concentrada'
}

// ---------------------------------------------------------------------------
// ECL - perdida crediticia esperada
// ---------------------------------------------------------------------------

/** Probabilidad de default por bucket de aging. */
export const PD_POR_BUCKET: Readonly<Record<BucketAging, number>> = {
  corriente: 0.01,
  '1-30': 0.02,
  '31-60': 0.08,
  '61-90': 0.2,
  '+90': 0.45,
  incobrable: 1,
}

/**
 *     ECL = suma( exposicion_i x PD_bucket_i )
 *
 * `exposicion_i` es el **saldo pendiente**, no el monto original de la factura.
 * Como `incobrable` es un bucket excluyente del aging, ninguna factura aporta dos veces.
 */
export function calcularEcl(aging: Aging): number {
  const ecl = BUCKETS_AGING.reduce((acumulado, bucket) => {
    return acumulado + aging[bucket].saldoCentavos * PD_POR_BUCKET[bucket]
  }, 0)

  // Las PD son fracciones decimales: se redondea una sola vez, sobre el total.
  return Math.round(ecl)
}

// ---------------------------------------------------------------------------
// Exposicion cambiaria
// ---------------------------------------------------------------------------

/**
 *     exposicion_ars = saldo_denominado_ars / saldo_total_normalizado_ars
 *
 * Devuelve `null` si la cartera esta vacia.
 */
export function calcularExposicionCambiaria(
  saldoArsCentavos: number,
  saldoUsdNormalizadoCentavos: number,
): number | null {
  const total = saldoArsCentavos + saldoUsdNormalizadoCentavos

  if (total <= 0) return null

  return saldoArsCentavos / total
}

/**
 * Ante un salto del MEP de `saltoMep` (fraccion: 0.25 = +25%), cuanto cae el valor **en
 * USD** de la porcion de cartera denominada en ARS.
 *
 *     caida = 1 - 1/(1 + X)   ==   X / (1 + X)
 *
 * Se implementa la forma `X / (1 + X)`, algebraicamente identica a la del skill pero
 * exacta en punto flotante: `1 - 1/1.25` da 0,19999999999999996 y `0.25/1.25` da 0,2.
 *
 * Devuelve `null` para un salto de -100% o peor (el MEP no puede valer cero o menos).
 */
export function calcularCaidaPorSaltoMep(saltoMep: number): number | null {
  if (saltoMep <= -1) return null

  return saltoMep / (1 + saltoMep)
}

// ---------------------------------------------------------------------------
// Score de riesgo del cliente
// ---------------------------------------------------------------------------

/** Cortes de normalizacion. Decision del skill: se cambian aca y se recalcula todo. */
export const CORTE_MORA_DIAS = 90
export const CORTE_ANTIGUEDAD_MESES = 36
export const CORTE_SHARE_FACTURACION = 0.15

function acotar0a100(valor: number): number {
  return Math.min(100, Math.max(0, valor))
}

/**
 * Score 0 a 100, **donde 100 es el mejor cliente**. Cuatro componentes ponderados:
 *
 * | Componente                          | Peso |
 * |-------------------------------------|-----:|
 * | A. Dias de mora promedio            |  40% |
 * | B. % de facturas fuera de termino   |  30% |
 * | C. Antiguedad como cliente          |  15% |
 * | D. Peso en la facturacion (penaliza)|  15% |
 *
 * D penaliza a proposito: un cliente que concentra mucha facturacion es un riesgo por mas
 * que pague puntual. Es la contracara del HHI a nivel cartera.
 *
 * Se redondea al entero al final, una sola vez.
 */
export function calcularScoreDeRiesgo(entrada: ComponentesScoreRiesgo): number {
  const { moraPromedioDias, pctFacturasFueraDeTermino, mesesDeAntiguedad, shareFacturacion } =
    entrada

  const a = acotar0a100(100 - (moraPromedioDias / CORTE_MORA_DIAS) * 100)
  const b = acotar0a100(100 * (1 - pctFacturasFueraDeTermino))
  const c = acotar0a100((mesesDeAntiguedad / CORTE_ANTIGUEDAD_MESES) * 100)
  const d = acotar0a100(100 * (1 - Math.min(1, shareFacturacion / CORTE_SHARE_FACTURACION)))

  return Math.round(0.4 * a + 0.3 * b + 0.15 * c + 0.15 * d)
}
