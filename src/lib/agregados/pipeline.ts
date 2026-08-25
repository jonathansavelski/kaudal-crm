/**
 * Dataset de `/pipeline`: oportunidades abiertas por etapa, totales, total ponderado y
 * forecast.
 *
 * Las formulas son `calcularPipelinePonderado` y `calcularForecast` de
 * `src/lib/metricas/pipeline.ts`. Aca solo se filtra, se agrupa y se normaliza a ARS con
 * el ultimo MEP conocido: una oportunidad cierra en el futuro, no tiene fecha de hecho
 * pasada con la cual valuarse.
 */

import type { FilaAccion, FilaEmpresa, FilaOportunidad } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArsHoy } from '@/lib/agregados/contexto'
import { ETAPAS_ABIERTAS, ETIQUETA_ETAPA } from '@/lib/etiquetas'
import { PROBABILIDAD_POR_ETAPA, calcularForecast, calcularPipelinePonderado, esEtapaAbierta } from '@/lib/metricas/pipeline'
import { aUsdMep } from '@/lib/metricas/moneda'
import type { Canal, Etapa, Moneda } from '@/lib/metricas/tipos'
import type { Enums } from '@/types/supabase'

export type TipoOportunidad = Enums<'tipo_oportunidad'>

/** Oportunidad lista para pintar: con su empresa, su owner y su monto ya en ARS. */
export type OportunidadVista = {
  id: string
  titulo: string
  empresaId: string
  razonSocial: string
  owner: string
  etapa: Etapa
  origen: Canal
  tipo: TipoOportunidad
  probabilidad: number
  moneda: Moneda
  montoOriginalCentavos: number
  montoArsCentavos: number
  montoPonderadoCentavos: number
  montoUsdCentavos: number | null
  fechaCreacion: string
  fechaCierreEstimada: string
}

export type ColumnaEtapa = {
  etapa: Etapa
  etiqueta: string
  probabilidad: number
  cantidad: number
  totalCentavos: number
  totalPonderadoCentavos: number
  oportunidades: OportunidadVista[]
}

export type FiltrosPipeline = {
  owner: string
  origen: string
  tipo: string
  /** Cotas en **pesos**, como las escribe el usuario. Vacio = sin cota. */
  montoMin: string
  montoMax: string
}

export const FILTROS_PIPELINE_VACIOS: FiltrosPipeline = {
  owner: '',
  origen: '',
  tipo: '',
  montoMin: '',
  montoMax: '',
}

export type DatosPipeline = {
  columnas: ColumnaEtapa[]
  totalCentavos: number
  totalPonderadoCentavos: number
  cantidad: number
  /** Cantidad de oportunidades abiertas antes de aplicar los filtros. */
  cantidadSinFiltrar: number
  forecast3Centavos: number
  forecast6Centavos: number
  owners: string[]
  /** Oportunidades sin cotizacion para su moneda: quedaron fuera de los totales. */
  sinCotizacion: number
}

function aCentavos(pesos: string): number | null {
  if (pesos.trim() === '') return null
  const valor = Number(pesos)
  return Number.isFinite(valor) ? Math.round(valor * 100) : null
}

function normalizar(
  oportunidades: readonly FilaOportunidad[],
  empresas: readonly FilaEmpresa[],
  contexto: ContextoMacro,
): { abiertas: OportunidadVista[]; sinCotizacion: number } {
  const porEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa]))
  const abiertas: OportunidadVista[] = []
  let sinCotizacion = 0

  for (const cruda of oportunidades) {
    if (!esEtapaAbierta(cruda.etapa)) continue

    const empresa = porEmpresa.get(cruda.empresa_id)
    const montoArs = aArsHoy(contexto, cruda.monto_centavos, cruda.moneda)
    if (!empresa || montoArs === null) {
      sinCotizacion += 1
      continue
    }

    const probabilidad = PROBABILIDAD_POR_ETAPA[cruda.etapa]

    abiertas.push({
      id: cruda.id,
      titulo: cruda.titulo,
      empresaId: empresa.id,
      razonSocial: empresa.razon_social,
      owner: empresa.owner_comercial,
      etapa: cruda.etapa,
      origen: cruda.origen,
      tipo: cruda.tipo,
      probabilidad,
      moneda: cruda.moneda,
      montoOriginalCentavos: cruda.monto_centavos,
      montoArsCentavos: montoArs,
      montoPonderadoCentavos: calcularPipelinePonderado([
        { montoArsCentavos: montoArs, etapa: cruda.etapa },
      ]),
      montoUsdCentavos: aUsdMep(montoArs, contexto.mepUltimoCentavos),
      fechaCreacion: cruda.fecha_creacion,
      fechaCierreEstimada: cruda.fecha_cierre_estimada,
    })
  }

  return { abiertas, sinCotizacion }
}

function cumple(oportunidad: OportunidadVista, filtros: FiltrosPipeline): boolean {
  if (filtros.owner !== '' && oportunidad.owner !== filtros.owner) return false
  if (filtros.origen !== '' && oportunidad.origen !== filtros.origen) return false
  if (filtros.tipo !== '' && oportunidad.tipo !== filtros.tipo) return false

  const minimo = aCentavos(filtros.montoMin)
  if (minimo !== null && oportunidad.montoArsCentavos < minimo) return false

  const maximo = aCentavos(filtros.montoMax)
  if (maximo !== null && oportunidad.montoArsCentavos > maximo) return false

  return true
}

export function armarPipeline(
  filas: {
    oportunidades: readonly FilaOportunidad[]
    empresas: readonly FilaEmpresa[]
  },
  contexto: ContextoMacro,
  filtros: FiltrosPipeline,
  hoy: Date,
): DatosPipeline {
  const { abiertas, sinCotizacion } = normalizar(filas.oportunidades, filas.empresas, contexto)
  const filtradas = abiertas.filter((oportunidad) => cumple(oportunidad, filtros))

  const paraMetricas = filtradas.map((oportunidad) => ({
    montoArsCentavos: oportunidad.montoArsCentavos,
    etapa: oportunidad.etapa,
    fechaCierreEstimada: new Date(oportunidad.fechaCierreEstimada + 'T00:00:00'),
  }))

  const columnas: ColumnaEtapa[] = ETAPAS_ABIERTAS.map((etapa) => {
    const enEtapa = filtradas
      .filter((oportunidad) => oportunidad.etapa === etapa)
      .sort((a, b) => b.montoArsCentavos - a.montoArsCentavos)

    return {
      etapa,
      etiqueta: ETIQUETA_ETAPA[etapa],
      probabilidad: PROBABILIDAD_POR_ETAPA[etapa],
      cantidad: enEtapa.length,
      totalCentavos: enEtapa.reduce((suma, item) => suma + item.montoArsCentavos, 0),
      totalPonderadoCentavos: calcularPipelinePonderado(enEtapa),
      oportunidades: enEtapa,
    }
  })

  return {
    columnas,
    totalCentavos: columnas.reduce((suma, columna) => suma + columna.totalCentavos, 0),
    totalPonderadoCentavos: calcularPipelinePonderado(paraMetricas),
    cantidad: filtradas.length,
    cantidadSinFiltrar: abiertas.length,
    forecast3Centavos: calcularForecast(paraMetricas, hoy, 3),
    forecast6Centavos: calcularForecast(paraMetricas, hoy, 6),
    owners: [...new Set(filas.empresas.map((empresa) => empresa.owner_comercial))].sort((a, b) =>
      a.localeCompare(b, 'es-AR'),
    ),
    sinCotizacion,
  }
}

/** Acciones comerciales de una oportunidad, de la mas reciente a la mas vieja. */
export function accionesDeOportunidad(
  acciones: readonly FilaAccion[],
  oportunidadId: string,
): FilaAccion[] {
  return acciones
    .filter((accion) => accion.oportunidad_id === oportunidadId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}
