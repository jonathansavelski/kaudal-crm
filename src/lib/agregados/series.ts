/**
 * Serie mensual de facturacion y MRR, en valor nominal y en valor real.
 *
 * Es el grafico que sostiene la tesis de Kaudal: en la ventana de datos la inflacion
 * acumulada fue de casi 500%, asi que la linea nominal y la real cuentan dos historias
 * distintas. Las dos salen de las mismas filas; lo unico que cambia es `deflactar`.
 */

import { addMonths, endOfMonth, startOfMonth } from 'date-fns'

import type { FilaContrato } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArs } from '@/lib/agregados/contexto'
import { aIso } from '@/lib/agregados/facturas'
import type { FacturaSaneada, PuntoSerieMensual } from '@/lib/agregados/tipos'
import { deflactar } from '@/lib/metricas/moneda'
import { calcularMrr } from '@/lib/metricas/suscripciones'
import type { ContratoNormalizado } from '@/lib/metricas/tipos'

export const MESES_SERIE = 24

type Mes = { periodo: string; desde: string; hasta: string }

function ultimosMeses(hoy: Date, cantidad: number): Mes[] {
  const meses: Mes[] = []

  for (let atras = cantidad - 1; atras >= 0; atras -= 1) {
    const inicio = addMonths(startOfMonth(hoy), -atras)
    meses.push({
      periodo: aIso(inicio),
      desde: aIso(inicio),
      hasta: aIso(endOfMonth(inicio)),
    })
  }

  return meses
}

/**
 * Un contrato aporta al MRR de un mes si ya habia empezado antes de que el mes
 * terminara y todavia no habia terminado cuando el mes empezo. Los contratos
 * `pausado` no aportan nunca: `calcularMrr` los descarta por estado.
 */
function contratosDelMes(
  contratos: readonly FilaContrato[],
  mes: Mes,
  contexto: ContextoMacro,
): ContratoNormalizado[] {
  const normalizados: ContratoNormalizado[] = []

  for (const contrato of contratos) {
    if (contrato.fecha_inicio > mes.hasta) continue
    if (contrato.fecha_fin !== null && contrato.fecha_fin < mes.desde) continue
    if (contrato.estado === 'pausado') continue

    const abono = aArs(contexto, contrato.abono_mensual_centavos, contrato.moneda, mes.hasta)
    if (abono === null) continue

    // El estado historico lo dan las fechas, no la columna: un contrato cancelado en
    // 2026 estuvo activo en 2025 y su abono formaba parte del MRR de ese mes.
    normalizados.push({ abonoMensualArsCentavos: abono, estado: 'activo' })
  }

  return normalizados
}

export function armarSerieMensual(
  facturas: readonly FacturaSaneada[],
  contratos: readonly FilaContrato[],
  contexto: ContextoMacro,
  hoy: Date,
  cantidadMeses: number = MESES_SERIE,
): PuntoSerieMensual[] {
  const meses = ultimosMeses(hoy, cantidadMeses)
  const facturadoPorMes = new Map<string, { nominal: number; cantidad: number }>()

  for (const factura of facturas) {
    const periodo = factura.fechaEmision.slice(0, 7) + '-01'
    const acumulado = facturadoPorMes.get(periodo)
    if (acumulado) {
      acumulado.nominal += factura.montoArsCentavos
      acumulado.cantidad += 1
    } else {
      facturadoPorMes.set(periodo, { nominal: factura.montoArsCentavos, cantidad: 1 })
    }
  }

  return meses.map((mes) => {
    const facturado = facturadoPorMes.get(mes.periodo) ?? { nominal: 0, cantidad: 0 }
    const mrrNominal = calcularMrr(contratosDelMes(contratos, mes, contexto))
    const indice = contexto.indiceDeFecha(mes.hasta)

    const facturacionReal =
      indice === null ? null : deflactar(facturado.nominal, indice, contexto.indiceBase)
    const mrrReal = indice === null ? null : deflactar(mrrNominal, indice, contexto.indiceBase)

    return {
      periodo: mes.periodo,
      facturacionNominalCentavos: facturado.nominal,
      facturacionRealCentavos: facturacionReal ?? facturado.nominal,
      mrrNominalCentavos: mrrNominal,
      mrrRealCentavos: mrrReal ?? mrrNominal,
      cantidadFacturas: facturado.cantidad,
    }
  })
}
