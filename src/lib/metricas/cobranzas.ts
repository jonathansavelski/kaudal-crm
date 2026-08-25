/**
 * Cobranzas: aging, DSO, VAN de la cartera y perdida por inflacion.
 *
 * El saldo de cada factura lo calcula la vista `v_saldo_facturas` en Postgres; aca se
 * consume, no se recalcula.
 *
 * Fuente de verdad: skill `metricas-financieras`.
 */

import { differenceInCalendarDays } from 'date-fns'

import type { Aging, BucketAging, FacturaConSaldo } from '@/lib/metricas/tipos'
import { DIAS_COBRO_SIN_HISTORIAL } from '@/lib/metricas/tipos'

function agingVacio(): Aging {
  return {
    corriente: { saldoCentavos: 0, cantidad: 0 },
    '1-30': { saldoCentavos: 0, cantidad: 0 },
    '31-60': { saldoCentavos: 0, cantidad: 0 },
    '61-90': { saldoCentavos: 0, cantidad: 0 },
    '+90': { saldoCentavos: 0, cantidad: 0 },
    incobrable: { saldoCentavos: 0, cantidad: 0 },
  }
}

/**
 * Bucket de una factura segun sus dias de mora.
 *
 * `incobrable` gana sobre cualquier otro y es excluyente: una factura marcada incobrable
 * NO aparece ademas en `+90`. Si apareciera en los dos, el ECL la contaria dos veces.
 */
export function bucketDeFactura(factura: FacturaConSaldo, hoy: Date): BucketAging {
  if (factura.estado === 'incobrable') return 'incobrable'

  const diasMora = differenceInCalendarDays(hoy, factura.fechaVencimiento)

  if (diasMora <= 0) return 'corriente' // fecha_vencimiento >= hoy
  if (diasMora <= 30) return '1-30'
  if (diasMora <= 60) return '31-60'
  if (diasMora <= 90) return '61-90'
  return '+90'
}

/**
 * Reparte el saldo de la cartera en los seis buckets de aging.
 * Solo entran facturas con saldo mayor a cero: una factura saldada no es cartera.
 */
export function calcularAging(facturas: readonly FacturaConSaldo[], hoy: Date): Aging {
  const aging = agingVacio()

  for (const factura of facturas) {
    if (factura.saldoCentavos <= 0) continue

    const bucket = aging[bucketDeFactura(factura, hoy)]
    bucket.saldoCentavos += factura.saldoCentavos
    bucket.cantidad += 1
  }

  return aging
}

/**
 *     DSO = (saldo_promedio_cxc / ventas_a_credito_del_periodo) x dias_del_periodo
 *
 * Toda la facturacion de Nodus es a credito: se emite y se cobra despues.
 * Devuelve `null` si no hubo ventas en el periodo (no hay DSO que calcular).
 *
 * La multiplicacion va antes que la division a proposito: sobre enteros grandes evita
 * arrastrar el error del cociente intermedio.
 */
export function calcularDso(
  saldoPromedioCentavos: number,
  ventasACreditoCentavos: number,
  diasDelPeriodo: number,
): number | null {
  if (ventasACreditoCentavos <= 0) return null

  return (saldoPromedioCentavos * diasDelPeriodo) / ventasACreditoCentavos
}

/**
 * Tasa efectiva anual a partir de la TNA de plazo fijo, con capitalizacion mensual.
 *
 *     TEA = (1 + TNA/12)^12 - 1
 *
 * Se exporta aparte porque el error tipico es descontar con la TNA como si ya fuera TEA.
 */
export function calcularTea(tnaAnual: number): number {
  return Math.pow(1 + tnaAnual / 12, 12) - 1
}

/**
 * Dias hasta el cobro esperado de una factura.
 *
 * - No vencida: dias que faltan hasta el vencimiento.
 * - Vencida: se asume el plazo promedio historico de mora de esa empresa; sin historial,
 *   {@link DIAS_COBRO_SIN_HISTORIAL} dias.
 */
export function diasHastaCobroEsperado(factura: FacturaConSaldo, hoy: Date): number {
  const diasHastaVencimiento = differenceInCalendarDays(factura.fechaVencimiento, hoy)

  if (diasHastaVencimiento >= 0) return diasHastaVencimiento

  return factura.moraPromedioEmpresaDias ?? DIAS_COBRO_SIN_HISTORIAL
}

/**
 *     VAN = suma( saldo_i / (1 + TEA)^(dias_hasta_cobro_esperado_i / 365) )
 *
 * Las facturas `incobrable` no entran: su valor esperado lo maneja el ECL. Tampoco las
 * de saldo cero. Los saldos entran ya normalizados a ARS.
 */
export function calcularVanCartera(
  facturas: readonly FacturaConSaldo[],
  tnaAnual: number,
  hoy: Date,
): number {
  const tea = calcularTea(tnaAnual)

  const van = facturas.reduce((acumulado, factura) => {
    if (factura.saldoCentavos <= 0) return acumulado
    if (factura.estado === 'incobrable') return acumulado

    const dias = diasHastaCobroEsperado(factura, hoy)
    return acumulado + factura.saldoCentavos / Math.pow(1 + tea, dias / 365)
  }, 0)

  // Unico redondeo, sobre el total: los descuentos son irracionales por construccion.
  return Math.round(van)
}

/**
 *     valor_real = nominal x ipc_emision / ipc_cobro
 *     perdida    = nominal - valor_real
 *
 * Ojo con la direccion: aca el nominal se lleva a pesos del **mes de emision** (se
 * pregunta cuanto valia realmente lo que entro), que es el inverso de `deflactar()`,
 * donde el mes base se elige libre. Son dos usos distintos del mismo cociente.
 *
 * Para facturas abiertas se pasa el IPC del ultimo mes disponible como `ipcCobro`.
 * Devuelve `null` si `ipcCobro` no es positivo.
 */
export function calcularPerdidaPorInflacion(
  nominalCentavos: number,
  ipcEmision: number,
  ipcCobro: number,
): number | null {
  if (ipcCobro <= 0) return null

  const valorReal = (nominalCentavos * ipcEmision) / ipcCobro

  return Math.round(nominalCentavos - valorReal)
}
