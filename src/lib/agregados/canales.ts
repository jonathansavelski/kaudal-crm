/**
 * Unit economics por canal de adquisicion: CAC, LTV y el ratio entre los dos.
 *
 * Atribucion, dicha sin vueltas:
 *  - **Costo**: cada accion comercial se atribuye al canal de su campania; si no tiene
 *    campania, al `origen` de su oportunidad. Las acciones sin campania ni oportunidad
 *    no se pueden atribuir y quedan afuera (la pantalla informa cuantas son).
 *  - **Clientes nuevos**: empresas distintas con al menos una oportunidad `ganada`,
 *    agrupadas por el `origen` de esa oportunidad.
 *  - **LTV**: se usa el ARPA del canal y el churn mensual **global** de la cartera. No
 *    hay churn por canal confiable con 12 bajas en tres anios.
 */

import { addMonths, startOfMonth } from 'date-fns'

import type { FilaAccion, FilaCampania, FilaContrato, FilaOportunidad } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArs, aArsHoy } from '@/lib/agregados/contexto'
import { aIso } from '@/lib/agregados/facturas'
import type { FilaCanal } from '@/lib/agregados/tipos'
import { ETIQUETA_CANAL } from '@/lib/etiquetas'
import {
  calcularArpa,
  calcularCacPorCanal,
  calcularChurnMensual,
  calcularLtv,
} from '@/lib/metricas/suscripciones'
import type { Canal, ContratoNormalizado, ResumenCanal } from '@/lib/metricas/tipos'
import { CANALES } from '@/lib/metricas/tipos'

/** Umbral estandar de unit economics sanos (skill `charts-crm` §7). */
export const UMBRAL_LTV_CAC = 3

export type ResultadoCanales = {
  filas: FilaCanal[]
  churnMensual: number | null
  accionesSinAtribuir: number
}

type Entrada = {
  acciones: readonly FilaAccion[]
  campanias: readonly FilaCampania[]
  oportunidades: readonly FilaOportunidad[]
  contratos: readonly FilaContrato[]
  contexto: ContextoMacro
  hoy: Date
}

/**
 * Churn mensual promedio de los ultimos 12 meses. Cada mes se calcula con
 * `calcularChurnMensual`; aca se promedian los meses que se pudieron calcular.
 */
export function calcularChurnPromedio(
  contratos: readonly FilaContrato[],
  hoy: Date,
  meses = 12,
): number | null {
  const valores: number[] = []

  for (let atras = meses; atras >= 1; atras -= 1) {
    const inicio = aIso(addMonths(startOfMonth(hoy), -atras))
    const finExclusivo = aIso(addMonths(startOfMonth(hoy), -atras + 1))

    let activosAlInicio = 0
    let perdidos = 0

    for (const contrato of contratos) {
      const fin = contrato.fecha_fin
      if (contrato.fecha_inicio < inicio && (fin === null || fin >= inicio)) activosAlInicio += 1
      if (contrato.estado === 'cancelado' && fin !== null && fin >= inicio && fin < finExclusivo) {
        perdidos += 1
      }
    }

    const churn = calcularChurnMensual(perdidos, activosAlInicio)
    if (churn !== null) valores.push(churn)
  }

  if (valores.length === 0) return null

  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length
}

/** Canal de adquisicion de cada empresa: el origen de su primera oportunidad ganada. */
function canalPorEmpresa(oportunidades: readonly FilaOportunidad[]): Map<string, Canal> {
  const ganadas = oportunidades
    .filter((oportunidad) => oportunidad.etapa === 'ganada')
    .sort((a, b) => a.fecha_creacion.localeCompare(b.fecha_creacion))

  const canal = new Map<string, Canal>()
  for (const oportunidad of ganadas) {
    if (!canal.has(oportunidad.empresa_id)) canal.set(oportunidad.empresa_id, oportunidad.origen)
  }

  return canal
}

export function armarCanales(entrada: Entrada): ResultadoCanales {
  const { acciones, campanias, oportunidades, contratos, contexto, hoy } = entrada

  const canalDeCampania = new Map(campanias.map((campania) => [campania.id, campania.canal]))
  const origenDeOportunidad = new Map(
    oportunidades.map((oportunidad) => [oportunidad.id, oportunidad.origen]),
  )

  const costoPorCanal = new Map<Canal, number>()
  let accionesSinAtribuir = 0

  for (const accion of acciones) {
    const canal =
      (accion.campania_id ? canalDeCampania.get(accion.campania_id) : undefined) ??
      (accion.oportunidad_id ? origenDeOportunidad.get(accion.oportunidad_id) : undefined)

    if (!canal) {
      accionesSinAtribuir += 1
      continue
    }

    const costo = aArs(contexto, accion.costo_centavos, accion.moneda, accion.fecha)
    if (costo === null) continue

    costoPorCanal.set(canal, (costoPorCanal.get(canal) ?? 0) + costo)
  }

  const adquisicion = canalPorEmpresa(oportunidades)
  const clientesPorCanal = new Map<Canal, number>()
  for (const canal of adquisicion.values()) {
    clientesPorCanal.set(canal, (clientesPorCanal.get(canal) ?? 0) + 1)
  }

  const resumenes: ResumenCanal[] = CANALES.map((canal) => ({
    canal,
    costoArsCentavos: costoPorCanal.get(canal) ?? 0,
    clientesNuevos: clientesPorCanal.get(canal) ?? 0,
  }))
  const cacPorCanal = calcularCacPorCanal(resumenes)

  // MRR y clientes activos de cada canal, para el ARPA que alimenta el LTV.
  const contratosPorCanal = new Map<Canal, ContratoNormalizado[]>()
  const activosPorCanal = new Map<Canal, Set<string>>()

  for (const contrato of contratos) {
    const canal = adquisicion.get(contrato.empresa_id)
    if (!canal) continue

    const abono = aArsHoy(contexto, contrato.abono_mensual_centavos, contrato.moneda)
    if (abono === null) continue

    const lista = contratosPorCanal.get(canal) ?? []
    lista.push({ abonoMensualArsCentavos: abono, estado: contrato.estado })
    contratosPorCanal.set(canal, lista)

    if (contrato.estado === 'activo') {
      const empresas = activosPorCanal.get(canal) ?? new Set<string>()
      empresas.add(contrato.empresa_id)
      activosPorCanal.set(canal, empresas)
    }
  }

  const churnMensual = calcularChurnPromedio(contratos, hoy)

  const filas: FilaCanal[] = CANALES.map((canal) => {
    const cacCentavos = cacPorCanal[canal]
    const mrr = (contratosPorCanal.get(canal) ?? []).reduce(
      (suma, contrato) =>
        contrato.estado === 'activo' ? suma + contrato.abonoMensualArsCentavos : suma,
      0,
    )
    const arpa = calcularArpa(mrr, activosPorCanal.get(canal)?.size ?? 0)
    const ltvCentavos =
      arpa === null || churnMensual === null ? null : calcularLtv(arpa, churnMensual)

    return {
      canal,
      etiqueta: ETIQUETA_CANAL[canal],
      cacCentavos,
      ltvCentavos,
      // Cociente de dos metricas ya calculadas, no una formula nueva.
      ratio:
        cacCentavos !== null && cacCentavos > 0 && ltvCentavos !== null
          ? ltvCentavos / cacCentavos
          : null,
      clientesNuevos: clientesPorCanal.get(canal) ?? 0,
      costoCentavos: costoPorCanal.get(canal) ?? 0,
    }
  })

  return { filas, churnMensual, accionesSinAtribuir }
}
