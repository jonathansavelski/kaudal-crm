/**
 * Pipeline comercial: probabilidades por etapa, pipeline ponderado, ciclo de venta
 * y forecast.
 *
 * Fuente de verdad: skill `metricas-financieras`.
 */

import { addMonths, differenceInCalendarDays } from 'date-fns'

import type {
  Etapa,
  OportunidadCerrada,
  OportunidadConCierreEstimado,
  OportunidadNormalizada,
} from '@/lib/metricas/tipos'

/**
 * Tabla fija de probabilidad de cierre por etapa. Es la unica fuente: la columna
 * `probabilidad` de la tabla `oportunidades` se deriva de aca, no se carga a mano.
 * Si una fila viniera con un valor distinto, manda la etapa.
 */
export const PROBABILIDAD_POR_ETAPA: Readonly<Record<Etapa, number>> = {
  prospecto: 0.05,
  calificado: 0.15,
  demo: 0.3,
  propuesta: 0.5,
  negociacion: 0.75,
  ganada: 1,
  perdida: 0,
}

/**
 * Una oportunidad esta abierta mientras no este `ganada` ni `perdida`. El pipeline mide
 * lo que falta cerrar; incluir lo cerrado lo distorsiona.
 */
export function esEtapaAbierta(etapa: Etapa): boolean {
  return etapa !== 'ganada' && etapa !== 'perdida'
}

/**
 *     pipeline_ponderado = suma( monto_normalizado_ars_i x probabilidad(etapa_i) )
 *
 * Solo sobre oportunidades abiertas. Los montos entran ya normalizados a ARS.
 */
export function calcularPipelinePonderado(
  oportunidades: readonly OportunidadNormalizada[],
): number {
  const total = oportunidades.reduce((acumulado, oportunidad) => {
    if (!esEtapaAbierta(oportunidad.etapa)) return acumulado
    return acumulado + oportunidad.montoArsCentavos * PROBABILIDAD_POR_ETAPA[oportunidad.etapa]
  }, 0)

  // Las probabilidades son fracciones decimales, asi que el producto puede caer en
  // centavos fraccionarios. Se redondea una sola vez, sobre el total, nunca por termino.
  return Math.round(total)
}

/**
 *     ciclo_dias = promedio( fecha_cierre_real - fecha_creacion )  sobre ganadas
 *
 * Solo `ganada` y solo con `fechaCierreReal` no nula. Diferencia en dias calendario
 * completos. Devuelve `null` si no hay ninguna oportunidad ganada con cierre cargado.
 */
export function calcularCicloDeVenta(oportunidades: readonly OportunidadCerrada[]): number | null {
  let sumaDias = 0
  let cantidad = 0

  for (const oportunidad of oportunidades) {
    if (oportunidad.etapa !== 'ganada') continue
    if (oportunidad.fechaCierreReal === null) continue

    sumaDias += differenceInCalendarDays(oportunidad.fechaCierreReal, oportunidad.fechaCreacion)
    cantidad += 1
  }

  if (cantidad === 0) return null

  return sumaDias / cantidad
}

/**
 *     forecast(n_meses) = suma( monto_ars_i x probabilidad(etapa_i) )
 *                         sobre oportunidades abiertas cuya fecha_cierre_estimada
 *                         cae dentro de los proximos n meses
 *
 * Mismo criterio que el pipeline ponderado, filtrando por ventana temporal. La ventana
 * es [hoy, hoy + n meses], ambos extremos incluidos. Se expone a 3 y a 6 meses.
 */
export function calcularForecast(
  oportunidades: readonly OportunidadConCierreEstimado[],
  hoy: Date,
  meses: number,
): number {
  // Se compara por dia calendario, no por timestamp. Si `hoy` viniera con hora
  // (o sea, `new Date()`), una oportunidad que cierra hoy a las 00:00 quedaria
  // afuera de su propia ventana: la cota inferior se comportaria como excluida.
  const hasta = addMonths(hoy, meses)

  const enVentana = oportunidades.filter((oportunidad) => {
    const desdeHoy = differenceInCalendarDays(oportunidad.fechaCierreEstimada, hoy)
    const hastaLimite = differenceInCalendarDays(hasta, oportunidad.fechaCierreEstimada)
    return desdeHoy >= 0 && hastaLimite >= 0
  })

  return calcularPipelinePonderado(enVentana)
}
