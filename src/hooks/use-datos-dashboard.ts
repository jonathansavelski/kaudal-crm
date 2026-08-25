/**
 * Trae de una sola vez las filas que necesitan el dashboard y `/mercado`, y arma el
 * dataset con `armarDashboard`.
 *
 * Una sola query para las nueve tablas: si fueran nueve queries independientes, la
 * pantalla mostraria KPIs calculados sobre datos parciales mientras las demas cargan,
 * y los totales no cerrarian por un segundo. Prefiero un skeleton un rato mas.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  traerAcciones,
  traerCampanias,
  traerCobros,
  traerContratos,
  traerEmpresas,
  traerFacturas,
  traerIpc,
  traerMepHistorico,
  traerOportunidades,
} from '@/lib/api/consultas'
import type { FilasCrudas } from '@/lib/agregados/dashboard'
import { armarDashboard } from '@/lib/agregados/dashboard'

export const CLAVE_DATOS_CRM = ['datos-crm'] as const

async function traerFilas(): Promise<FilasCrudas> {
  const [facturas, cobros, empresas, contratos, oportunidades, acciones, campanias, ipc, mep] =
    await Promise.all([
      traerFacturas(),
      traerCobros(),
      traerEmpresas(),
      traerContratos(),
      traerOportunidades(),
      traerAcciones(),
      traerCampanias(),
      traerIpc(),
      traerMepHistorico(),
    ])

  return { facturas, cobros, empresas, contratos, oportunidades, acciones, campanias, ipc, mep }
}

/** Las filas crudas, compartidas entre pantallas por la cache de TanStack Query. */
export function useFilasCrm() {
  return useQuery({
    queryKey: CLAVE_DATOS_CRM,
    queryFn: traerFilas,
    staleTime: 5 * 60_000,
  })
}

/**
 * `hoy` se recibe para que el armado sea determinista y no dependa de `Date.now()`
 * adentro de las funciones puras.
 */
export function useDatosDashboard(hoy: Date) {
  const consulta = useFilasCrm()
  const filas = consulta.data
  const dia = hoy.toDateString()

  const datos = useMemo(() => {
    if (!filas) return undefined
    return armarDashboard(filas, new Date(dia))
  }, [filas, dia])

  return { ...consulta, datos }
}
