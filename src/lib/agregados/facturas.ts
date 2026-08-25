/**
 * Cartera: saneo de `v_saldo_facturas`, aging, saldo nominal y real, y DSO.
 *
 * Todo importe se normaliza a ARS con el MEP venta **de la fecha de emision** y se
 * reexpresa a pesos del mes base con `deflactar`. Las formulas son las de
 * `src/lib/metricas/`; aca solo se agrupan filas.
 */

import { addMonths, endOfMonth, startOfMonth, subDays } from 'date-fns'

import type { FilaCobro, FilaFactura } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArs } from '@/lib/agregados/contexto'
import type { FacturaSaneada, PorcionAging } from '@/lib/agregados/tipos'
import { calcularDso } from '@/lib/metricas/cobranzas'
import { deflactar } from '@/lib/metricas/moneda'
import type { Aging, FacturaConSaldo } from '@/lib/metricas/tipos'
import { BUCKETS_AGING } from '@/lib/metricas/tipos'

/** Meses de cierre que promedia el DSO, mas el corte de hoy: 13 cortes en total. */
export const MESES_VENTANA_DSO = 12
const DIAS_ANIO = 365

export type Cartera = {
  facturas: FacturaSaneada[]
  /** Facturas que no se pudieron llevar a ARS por falta de cotizacion. */
  sinCotizacion: number
}

/** Fecha a ISO local. `toISOString()` corre un dia cuando el huso es negativo. */
export function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return [fecha.getFullYear(), mes, dia].join('-')
}

export function aFechaLocal(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

/**
 * Deja solo las filas completas de la vista (sus columnas son nullables porque PostgREST
 * no sabe que la vista nunca devuelve nulos ahi) y las normaliza a ARS.
 */
export function sanearFacturas(filas: readonly FilaFactura[], contexto: ContextoMacro): Cartera {
  const facturas: FacturaSaneada[] = []
  let sinCotizacion = 0

  for (const fila of filas) {
    const id = fila.factura_id
    const empresaId = fila.empresa_id
    const emision = fila.fecha_emision
    const vencimiento = fila.fecha_vencimiento
    const moneda = fila.moneda
    const estado = fila.estado_vigente

    if (!id || !empresaId || !emision || !vencimiento || !moneda || !estado) continue

    const montoArs = aArs(contexto, fila.monto_centavos ?? 0, moneda, emision)
    const saldoArs = aArs(contexto, fila.saldo_centavos ?? 0, moneda, emision)
    if (montoArs === null || saldoArs === null) {
      sinCotizacion += 1
      continue
    }

    const indiceEmision = contexto.indiceDeFecha(emision)
    const saldoReal =
      indiceEmision === null ? null : deflactar(saldoArs, indiceEmision, contexto.indiceBase)

    facturas.push({
      id,
      empresaId,
      fechaEmision: emision,
      fechaVencimiento: vencimiento,
      moneda,
      estadoVigente: estado,
      montoArsCentavos: montoArs,
      saldoArsCentavos: saldoArs,
      saldoRealCentavos: saldoReal ?? saldoArs,
      diasMora: Math.max(0, fila.dias_mora ?? 0),
      diasMoraAlCobro: fila.dias_mora_al_cobro,
      esUsd: moneda === 'USD',
      montoOriginalCentavos: fila.monto_centavos ?? 0,
      saldoOriginalCentavos: fila.saldo_centavos ?? 0,
    })
  }

  return { facturas, sinCotizacion }
}

/** Adapta la cartera al tipo que pide `calcularAging`. */
export function aFacturasConSaldo(facturas: readonly FacturaSaneada[]): FacturaConSaldo[] {
  return facturas.map((factura) => ({
    saldoCentavos: factura.saldoArsCentavos,
    fechaVencimiento: aFechaLocal(factura.fechaVencimiento),
    estado: factura.estadoVigente,
  }))
}

export function repartirAging(aging: Aging): PorcionAging[] {
  const total = BUCKETS_AGING.reduce((suma, bucket) => suma + aging[bucket].saldoCentavos, 0)

  return BUCKETS_AGING.map((bucket) => ({
    bucket,
    saldoCentavos: aging[bucket].saldoCentavos,
    cantidad: aging[bucket].cantidad,
    participacion: total > 0 ? aging[bucket].saldoCentavos / total : 0,
  }))
}

export type SaldoCartera = {
  nominalCentavos: number
  realCentavos: number
  saldoArsCentavos: number
  saldoUsdNormalizadoCentavos: number
}

/**
 * Saldo pendiente de cobro en sus dos lecturas: nominal (lo que se va a cobrar) y
 * reexpresado a pesos del mes base (lo que valia cuando se facturo). La brecha entre las
 * dos es lo que la inflacion ya licuo mientras la factura esperaba.
 */
export function calcularSaldoCartera(facturas: readonly FacturaSaneada[]): SaldoCartera {
  let nominalCentavos = 0
  let realCentavos = 0
  let saldoArsCentavos = 0
  let saldoUsdNormalizadoCentavos = 0

  for (const factura of facturas) {
    if (factura.saldoArsCentavos <= 0) continue

    nominalCentavos += factura.saldoArsCentavos
    realCentavos += factura.saldoRealCentavos
    if (factura.esUsd) saldoUsdNormalizadoCentavos += factura.saldoArsCentavos
    else saldoArsCentavos += factura.saldoArsCentavos
  }

  return { nominalCentavos, realCentavos, saldoArsCentavos, saldoUsdNormalizadoCentavos }
}

export type CobroNormalizado = { fecha: string; arsCentavos: number }
export type CobrosPorFactura = ReadonlyMap<string, readonly CobroNormalizado[]>

/**
 * Los cobros se llevan a ARS con el MEP de la **emision de su factura**, no con el del
 * dia del cobro: si no, el saldo de una factura en USD nunca cerraria en cero.
 */
export function indexarCobros(
  cobros: readonly FilaCobro[],
  facturas: readonly FacturaSaneada[],
  contexto: ContextoMacro,
): Map<string, CobroNormalizado[]> {
  const emisionPorFactura = new Map(facturas.map((factura) => [factura.id, factura.fechaEmision]))
  const indice = new Map<string, CobroNormalizado[]>()

  for (const cobro of cobros) {
    const emision = emisionPorFactura.get(cobro.factura_id)
    if (!emision) continue

    const ars = aArs(contexto, cobro.monto_centavos, cobro.moneda, emision)
    if (ars === null) continue

    const lista = indice.get(cobro.factura_id)
    if (lista) lista.push({ fecha: cobro.fecha, arsCentavos: ars })
    else indice.set(cobro.factura_id, [{ fecha: cobro.fecha, arsCentavos: ars }])
  }

  return indice
}

/** Saldo pendiente a una fecha de corte: lo emitido hasta ese dia menos lo cobrado. */
export function saldoALaFecha(
  facturas: readonly FacturaSaneada[],
  cobrosPorFactura: CobrosPorFactura,
  corte: string,
): number {
  let saldo = 0

  for (const factura of facturas) {
    if (factura.fechaEmision > corte) continue

    let cobrado = 0
    for (const cobro of cobrosPorFactura.get(factura.id) ?? []) {
      if (cobro.fecha <= corte) cobrado += cobro.arsCentavos
    }

    saldo += Math.max(0, factura.montoArsCentavos - cobrado)
  }

  return saldo
}

export type ResultadoDso = {
  dias: number | null
  saldoPromedioCentavos: number
  ventasCentavos: number
  cortes: number
}

/**
 *     DSO = (saldo promedio de CxC / ventas a credito del periodo) x dias del periodo
 *
 * El saldo promedio sale de los cierres de los ultimos 12 meses mas el de hoy: tomar
 * solo el saldo del dia haria saltar el DSO con cada factura grande recien emitida.
 * La formula es `calcularDso`; aca se preparan sus dos insumos.
 */
export function calcularDsoDeCartera(
  facturas: readonly FacturaSaneada[],
  cobrosPorFactura: CobrosPorFactura,
  hoy: Date,
): ResultadoDso {
  const desdeIso = aIso(subDays(hoy, DIAS_ANIO))
  const hoyIso = aIso(hoy)

  let ventasCentavos = 0
  for (const factura of facturas) {
    if (factura.fechaEmision > desdeIso && factura.fechaEmision <= hoyIso) {
      ventasCentavos += factura.montoArsCentavos
    }
  }

  const cortes: string[] = []
  for (let atras = MESES_VENTANA_DSO; atras >= 1; atras -= 1) {
    cortes.push(aIso(endOfMonth(addMonths(startOfMonth(hoy), -atras))))
  }
  cortes.push(hoyIso)

  const suma = cortes.reduce(
    (acumulado, corte) => acumulado + saldoALaFecha(facturas, cobrosPorFactura, corte),
    0,
  )
  const saldoPromedioCentavos = Math.round(suma / cortes.length)

  return {
    dias: calcularDso(saldoPromedioCentavos, ventasCentavos, DIAS_ANIO),
    saldoPromedioCentavos,
    ventasCentavos,
    cortes: cortes.length,
  }
}

/** Facturacion de los ultimos 12 meses por empresa, normalizada a ARS. */
export function facturacionUltimos12Meses(
  facturas: readonly FacturaSaneada[],
  hoy: Date,
): Map<string, number> {
  const desde = aIso(subDays(hoy, DIAS_ANIO))
  const porEmpresa = new Map<string, number>()

  for (const factura of facturas) {
    if (factura.fechaEmision <= desde) continue
    porEmpresa.set(
      factura.empresaId,
      (porEmpresa.get(factura.empresaId) ?? 0) + factura.montoArsCentavos,
    )
  }

  return porEmpresa
}
