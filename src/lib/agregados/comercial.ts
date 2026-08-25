/**
 * Embudo de pipeline y reparto de facturacion por sector.
 *
 * El embudo se ordena por **etapa del proceso**, nunca por monto: el orden es la
 * informacion (skill `charts-crm` §7).
 */

import type { FilaEmpresa, FilaOportunidad } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArsHoy } from '@/lib/agregados/contexto'
import type { PorcionSector, TramoEmbudo } from '@/lib/agregados/tipos'
import { ETAPAS_ABIERTAS, ETIQUETA_ETAPA, ETIQUETA_SECTOR } from '@/lib/etiquetas'
import { PROBABILIDAD_POR_ETAPA, calcularPipelinePonderado } from '@/lib/metricas/pipeline'
import type { OportunidadConCierreEstimado, OportunidadNormalizada } from '@/lib/metricas/tipos'

/**
 * Las oportunidades abiertas cierran en el futuro, asi que no tienen fecha de hecho
 * pasada: se valuan al ultimo MEP conocido, que es la mejor cotizacion disponible.
 *
 * `mepCentavos` deja pisar esa cotizacion. Lo usa el simulador de escenarios de
 * `/mercado` para revaluar las oportunidades en USD ante un salto del MEP.
 */
export function normalizarOportunidades(
  oportunidades: readonly FilaOportunidad[],
  contexto: ContextoMacro,
  mepCentavos?: number,
): OportunidadConCierreEstimado[] {
  const normalizadas: OportunidadConCierreEstimado[] = []

  for (const oportunidad of oportunidades) {
    const monto = aArsHoy(contexto, oportunidad.monto_centavos, oportunidad.moneda, mepCentavos)
    if (monto === null) continue

    normalizadas.push({
      montoArsCentavos: monto,
      etapa: oportunidad.etapa,
      fechaCierreEstimada: new Date(oportunidad.fecha_cierre_estimada + 'T00:00:00'),
    })
  }

  return normalizadas
}

export function armarEmbudo(
  oportunidades: readonly OportunidadNormalizada[],
): TramoEmbudo[] {
  return ETAPAS_ABIERTAS.map((etapa) => {
    const enEtapa = oportunidades.filter((oportunidad) => oportunidad.etapa === etapa)
    const montoCentavos = enEtapa.reduce((suma, item) => suma + item.montoArsCentavos, 0)

    return {
      etapa,
      etiqueta: ETIQUETA_ETAPA[etapa],
      montoCentavos,
      montoPonderadoCentavos: calcularPipelinePonderado(enEtapa),
      cantidad: enEtapa.length,
      probabilidad: PROBABILIDAD_POR_ETAPA[etapa],
    }
  })
}

/** Maximo de porciones antes de agrupar en "otros": una torta de 20 no comunica nada. */
export const MAX_PORCIONES = 7

export function armarSectores(
  facturacionPorEmpresa: ReadonlyMap<string, number>,
  empresas: readonly FilaEmpresa[],
  maxPorciones: number = MAX_PORCIONES,
): PorcionSector[] {
  const sectorPorEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa.sector]))
  const acumulado = new Map<string, { monto: number; clientes: number }>()

  for (const [empresaId, monto] of facturacionPorEmpresa) {
    if (monto <= 0) continue
    const sector = sectorPorEmpresa.get(empresaId)
    if (!sector) continue

    const previo = acumulado.get(sector)
    if (previo) {
      previo.monto += monto
      previo.clientes += 1
    } else {
      acumulado.set(sector, { monto, clientes: 1 })
    }
  }

  const total = [...acumulado.values()].reduce((suma, item) => suma + item.monto, 0)
  if (total <= 0) return []

  const ordenado = [...acumulado.entries()].sort((a, b) => b[1].monto - a[1].monto)
  const principales = ordenado.slice(0, maxPorciones)
  const resto = ordenado.slice(maxPorciones)

  const porciones: PorcionSector[] = principales.map(([sector, item]) => ({
    sector,
    etiqueta: ETIQUETA_SECTOR[sector as keyof typeof ETIQUETA_SECTOR] ?? sector,
    facturacionCentavos: item.monto,
    participacion: item.monto / total,
    cantidadClientes: item.clientes,
  }))

  if (resto.length > 0) {
    const monto = resto.reduce((suma, [, item]) => suma + item.monto, 0)
    porciones.push({
      sector: 'otros',
      etiqueta: `Otros (${resto.length} sectores)`,
      facturacionCentavos: monto,
      participacion: monto / total,
      cantidadClientes: resto.reduce((suma, [, item]) => suma + item.clientes, 0),
    })
  }

  return porciones
}
