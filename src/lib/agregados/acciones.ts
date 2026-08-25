/**
 * Dataset de `/acciones`: el detalle de los toques comerciales y el resumen por campania.
 *
 * Nota de alcance: el **ROI de campania** no esta en el skill `metricas-financieras`, que
 * es la fuente de verdad de las formulas. Se define aca, en la capa de agregados, con la
 * cuenta escrita explicita y su test al lado, y queda anotado para que `analista-financiero`
 * lo suba al skill si lo valida. Lo que no se hace es calcularlo dentro de un componente.
 *
 *     inversion   = presupuesto de la campania, normalizado a ARS a su fecha de inicio
 *     retorno     = monto ARS de las oportunidades GANADAS atribuidas a la campania
 *     roi         = (retorno - inversion) / inversion
 *
 * La atribucion es directa y auditable: una oportunidad pertenece a una campania si
 * existe al menos una accion comercial que apunta a las dos. No se infiere por canal.
 */

import type {
  FilaAccion,
  FilaCampania,
  FilaEmpresa,
  FilaOportunidad,
} from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArs, aArsHoy } from '@/lib/agregados/contexto'
import { normalizarTexto } from '@/lib/agregados/cuentas'
import { ETIQUETA_CANAL } from '@/lib/etiquetas'
import type { Canal } from '@/lib/metricas/tipos'
import type { Enums } from '@/types/supabase'

export type TipoAccion = Enums<'tipo_accion'>
export type ResultadoAccion = Enums<'resultado_accion'>

export type FilaAccionVista = {
  id: string
  fecha: string
  tipo: TipoAccion
  resultado: ResultadoAccion
  empresaId: string
  razonSocial: string
  owner: string
  campaniaId: string | null
  campania: string
  oportunidadId: string | null
  oportunidad: string
  costoArsCentavos: number
  notas: string | null
}

export type FilaCampaniaVista = {
  id: string
  nombre: string
  canal: Canal
  etiquetaCanal: string
  fechaInicio: string
  fechaFin: string
  presupuestoArsCentavos: number
  costoAccionesArsCentavos: number
  acciones: number
  oportunidadesAtribuidas: number
  oportunidadesGanadas: number
  retornoArsCentavos: number
  /** `null` si la campania no tiene presupuesto cargado: dividir por cero no es un dato. */
  roi: number | null
}

export type FiltrosAcciones = {
  busqueda: string
  tipo: string
  resultado: string
  campania: string
  desde: string
  hasta: string
}

export const FILTROS_ACCIONES_VACIOS: FiltrosAcciones = {
  busqueda: '',
  tipo: '',
  resultado: '',
  campania: '',
  desde: '',
  hasta: '',
}

export function armarAcciones(
  filas: {
    acciones: readonly FilaAccion[]
    campanias: readonly FilaCampania[]
    empresas: readonly FilaEmpresa[]
    oportunidades: readonly FilaOportunidad[]
  },
  contexto: ContextoMacro,
): FilaAccionVista[] {
  const empresas = new Map(filas.empresas.map((empresa) => [empresa.id, empresa]))
  const campanias = new Map(filas.campanias.map((campania) => [campania.id, campania.nombre]))
  const oportunidades = new Map(
    filas.oportunidades.map((oportunidad) => [oportunidad.id, oportunidad.titulo]),
  )

  return filas.acciones
    .map((accion) => {
      const empresa = empresas.get(accion.empresa_id)

      return {
        id: accion.id,
        fecha: accion.fecha,
        tipo: accion.tipo,
        resultado: accion.resultado,
        empresaId: accion.empresa_id,
        razonSocial: empresa?.razon_social ?? 'Cuenta dada de baja',
        owner: empresa?.owner_comercial ?? '',
        campaniaId: accion.campania_id,
        campania: accion.campania_id
          ? (campanias.get(accion.campania_id) ?? 'Campaña dada de baja')
          : 'Sin campaña',
        oportunidadId: accion.oportunidad_id,
        oportunidad: accion.oportunidad_id
          ? (oportunidades.get(accion.oportunidad_id) ?? 'Oportunidad dada de baja')
          : 'Sin oportunidad',
        costoArsCentavos: aArs(contexto, accion.costo_centavos, accion.moneda, accion.fecha) ?? 0,
        notas: accion.notas,
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export function filtrarAcciones(
  filas: readonly FilaAccionVista[],
  filtros: FiltrosAcciones,
): FilaAccionVista[] {
  const busqueda = normalizarTexto(filtros.busqueda.trim())

  return filas.filter((fila) => {
    if (filtros.tipo !== '' && fila.tipo !== filtros.tipo) return false
    if (filtros.resultado !== '' && fila.resultado !== filtros.resultado) return false
    if (filtros.campania !== '' && (fila.campaniaId ?? 'sin') !== filtros.campania) return false
    if (filtros.desde !== '' && fila.fecha < filtros.desde) return false
    if (filtros.hasta !== '' && fila.fecha > filtros.hasta) return false

    if (busqueda !== '') {
      const campos = normalizarTexto(
        [fila.razonSocial, fila.campania, fila.oportunidad, fila.notas ?? ''].join(' '),
      )
      if (!campos.includes(busqueda)) return false
    }

    return true
  })
}

export function armarCampanias(
  filas: {
    acciones: readonly FilaAccion[]
    campanias: readonly FilaCampania[]
    oportunidades: readonly FilaOportunidad[]
  },
  contexto: ContextoMacro,
): FilaCampaniaVista[] {
  const oportunidades = new Map(
    filas.oportunidades.map((oportunidad) => [oportunidad.id, oportunidad]),
  )

  type Acumulado = { acciones: number; costo: number; atribuidas: Set<string> }
  const porCampania = new Map<string, Acumulado>()

  for (const accion of filas.acciones) {
    if (!accion.campania_id) continue

    const acumulado = porCampania.get(accion.campania_id) ?? {
      acciones: 0,
      costo: 0,
      atribuidas: new Set<string>(),
    }
    acumulado.acciones += 1
    acumulado.costo += aArs(contexto, accion.costo_centavos, accion.moneda, accion.fecha) ?? 0
    if (accion.oportunidad_id) acumulado.atribuidas.add(accion.oportunidad_id)

    porCampania.set(accion.campania_id, acumulado)
  }

  return filas.campanias
    .map((campania) => {
      const acumulado = porCampania.get(campania.id) ?? {
        acciones: 0,
        costo: 0,
        atribuidas: new Set<string>(),
      }

      let ganadas = 0
      let retorno = 0
      for (const oportunidadId of acumulado.atribuidas) {
        const oportunidad = oportunidades.get(oportunidadId)
        if (!oportunidad || oportunidad.etapa !== 'ganada') continue

        ganadas += 1
        retorno += aArsHoy(contexto, oportunidad.monto_centavos, oportunidad.moneda) ?? 0
      }

      const presupuesto =
        aArs(contexto, campania.presupuesto_centavos, campania.moneda, campania.fecha_inicio) ?? 0

      return {
        id: campania.id,
        nombre: campania.nombre,
        canal: campania.canal,
        etiquetaCanal: ETIQUETA_CANAL[campania.canal],
        fechaInicio: campania.fecha_inicio,
        fechaFin: campania.fecha_fin,
        presupuestoArsCentavos: presupuesto,
        costoAccionesArsCentavos: acumulado.costo,
        acciones: acumulado.acciones,
        oportunidadesAtribuidas: acumulado.atribuidas.size,
        oportunidadesGanadas: ganadas,
        retornoArsCentavos: retorno,
        roi: presupuesto > 0 ? (retorno - presupuesto) / presupuesto : null,
      }
    })
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
}
