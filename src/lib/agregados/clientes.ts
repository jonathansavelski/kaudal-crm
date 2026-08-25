/**
 * Ranking de clientes por facturacion, con su score de riesgo.
 *
 * El score sale de `calcularScoreDeRiesgo`; aca solo se arman sus cuatro componentes a
 * partir de las facturas y de la fecha de alta de la empresa.
 */

import { differenceInCalendarMonths } from 'date-fns'

import type { FilaEmpresa } from '@/lib/api/consultas'
import { aFechaLocal } from '@/lib/agregados/facturas'
import type { ClienteRankeado, FacturaSaneada } from '@/lib/agregados/tipos'
import { calcularScoreDeRiesgo } from '@/lib/metricas/riesgo'

/** Tramos de lectura del score. El color acompana al texto, nunca lo reemplaza. */
export const ESCALA_RIESGO = [
  { desde: 80, etiqueta: 'Riesgo bajo (80-100)', color: 'var(--positivo)' },
  { desde: 60, etiqueta: 'Riesgo medio (60-79)', color: 'var(--aging-1-30)' },
  { desde: 40, etiqueta: 'Riesgo alto (40-59)', color: 'var(--aging-61-90)' },
  { desde: 0, etiqueta: 'Riesgo crítico (0-39)', color: 'var(--aging-90-mas)' },
] as const

export function colorDeScore(score: number): string {
  const tramo = ESCALA_RIESGO.find((item) => score >= item.desde)
  return tramo?.color ?? 'var(--neutro)'
}

export function etiquetaDeScore(score: number): string {
  const tramo = ESCALA_RIESGO.find((item) => score >= item.desde)
  return tramo?.etiqueta ?? 'Sin clasificar'
}

type Acumulado = {
  facturas: number
  fueraDeTermino: number
  sumaMora: number
  saldo: number
}

/**
 * Mora efectiva de una factura: los dias con los que se cobro si ya se cobro, o los dias
 * que lleva vencida si sigue abierta. Una factura al dia aporta cero, no se descarta.
 *
 * Se exporta porque la ficha de cuenta y la tabla maestra de `/cuentas` miden la misma
 * mora: si cada una la definiera a su manera, el score del ranking y el de la ficha
 * dirian cosas distintas del mismo cliente.
 */
export function moraDeFactura(factura: FacturaSaneada): number {
  if (factura.estadoVigente === 'pagada') return Math.max(0, factura.diasMoraAlCobro ?? 0)
  return Math.max(0, factura.diasMora)
}

export function rankearClientes(
  facturas: readonly FacturaSaneada[],
  facturacion12m: ReadonlyMap<string, number>,
  empresas: readonly FilaEmpresa[],
  hoy: Date,
  cuantos = 10,
): ClienteRankeado[] {
  const porEmpresa = new Map<string, Acumulado>()

  for (const factura of facturas) {
    const previo = porEmpresa.get(factura.empresaId) ?? {
      facturas: 0,
      fueraDeTermino: 0,
      sumaMora: 0,
      saldo: 0,
    }
    const mora = moraDeFactura(factura)

    previo.facturas += 1
    previo.sumaMora += mora
    if (mora > 0) previo.fueraDeTermino += 1
    if (factura.saldoArsCentavos > 0) previo.saldo += factura.saldoArsCentavos

    porEmpresa.set(factura.empresaId, previo)
  }

  const total = [...facturacion12m.values()].reduce((suma, monto) => suma + monto, 0)
  const datosEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa]))

  const rankeados: ClienteRankeado[] = []
  for (const [empresaId, facturacionCentavos] of facturacion12m) {
    if (facturacionCentavos <= 0) continue

    const empresa = datosEmpresa.get(empresaId)
    if (!empresa) continue

    const acumulado = porEmpresa.get(empresaId) ?? {
      facturas: 0,
      fueraDeTermino: 0,
      sumaMora: 0,
      saldo: 0,
    }
    const moraPromedioDias = acumulado.facturas > 0 ? acumulado.sumaMora / acumulado.facturas : 0
    const share = total > 0 ? facturacionCentavos / total : 0

    rankeados.push({
      empresaId,
      razonSocial: empresa.razon_social,
      facturacionCentavos,
      saldoCentavos: acumulado.saldo,
      moraPromedioDias,
      share,
      score: calcularScoreDeRiesgo({
        moraPromedioDias,
        pctFacturasFueraDeTermino:
          acumulado.facturas > 0 ? acumulado.fueraDeTermino / acumulado.facturas : 0,
        mesesDeAntiguedad: Math.max(
          0,
          differenceInCalendarMonths(hoy, aFechaLocal(empresa.fecha_alta)),
        ),
        shareFacturacion: share,
      }),
    })
  }

  return rankeados
    .sort((a, b) => b.facturacionCentavos - a.facturacionCentavos)
    .slice(0, cuantos)
}
