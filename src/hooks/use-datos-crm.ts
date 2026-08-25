/**
 * Datasets de las pantallas de la Fase 4, todos sobre la **misma** query de filas
 * (`useFilasCrm`). Una sola ida a Supabase para toda la app: si cada pantalla trajera lo
 * suyo, el mismo total daria distinto segun cuando cargo cada una.
 *
 * Los hooks solo memorizan el armado; el calculo vive en `src/lib/agregados/`, que a su
 * vez delega en `src/lib/metricas/`.
 */

import { useMemo } from 'react'

import { useFilasCrm } from '@/hooks/use-datos-dashboard'
import { armarAcciones, armarCampanias } from '@/lib/agregados/acciones'
import { armarCobranzas } from '@/lib/agregados/cobranzas'
import { armarContextoMacro } from '@/lib/agregados/contexto'
import { armarCuentas } from '@/lib/agregados/cuentas'
import { indexarCobros, sanearFacturas } from '@/lib/agregados/facturas'
import { armarFicha } from '@/lib/agregados/ficha'
import type { FiltrosPipeline } from '@/lib/agregados/pipeline'
import { armarPipeline } from '@/lib/agregados/pipeline'

/** Estado de la query, comun a todas las pantallas. */
export type EstadoConsulta = {
  cargando: boolean
  error: boolean
  reintentar: () => void
}

/**
 * Cartera saneada y contexto macro. Es la base de las cuatro pantallas, asi que se arma
 * una sola vez por render de datos y se comparte por memo.
 */
function useCartera(hoy: Date) {
  const consulta = useFilasCrm()
  const filas = consulta.data
  const dia = hoy.toDateString()

  const base = useMemo(() => {
    if (!filas) return undefined

    const contexto = armarContextoMacro(filas.ipc, filas.mep)
    const { facturas, sinCotizacion } = sanearFacturas(filas.facturas, contexto)

    return {
      contexto,
      facturas,
      sinCotizacion,
      cobrosPorFactura: indexarCobros(filas.cobros, facturas, contexto),
    }
  }, [filas])

  const estado: EstadoConsulta = {
    cargando: consulta.isPending,
    error: consulta.isError,
    reintentar: () => void consulta.refetch(),
  }

  return { filas, base, estado, dia }
}

export function usePipeline(filtros: FiltrosPipeline, hoy: Date) {
  const { filas, base, estado, dia } = useCartera(hoy)

  const datos = useMemo(() => {
    if (!filas || !base) return undefined
    return armarPipeline(filas, base.contexto, filtros, new Date(dia))
  }, [filas, base, filtros, dia])

  return { datos, acciones: filas?.acciones ?? [], contexto: base?.contexto, estado }
}

export function useCuentas(hoy: Date) {
  const { filas, base, estado, dia } = useCartera(hoy)

  const cuentas = useMemo(() => {
    if (!filas || !base) return undefined
    return armarCuentas(filas, base.facturas, base.contexto, new Date(dia))
  }, [filas, base, dia])

  return { cuentas, contexto: base?.contexto, estado }
}

export function useFichaCuenta(empresaId: string | undefined, hoy: Date, churnMensual: number | null) {
  const { filas, base, estado, dia } = useCartera(hoy)

  const ficha = useMemo(() => {
    if (!filas || !base || !empresaId) return undefined

    const cuentas = armarCuentas(filas, base.facturas, base.contexto, new Date(dia))
    return armarFicha(
      empresaId,
      filas,
      cuentas,
      base.facturas,
      base.contexto,
      churnMensual,
      new Date(dia),
    )
  }, [filas, base, empresaId, dia, churnMensual])

  return { ficha, contexto: base?.contexto, estado }
}

export function useCobranzas(tnaAnual: number, hoy: Date) {
  const { filas, base, estado, dia } = useCartera(hoy)

  const datos = useMemo(() => {
    if (!filas || !base) return undefined

    return armarCobranzas(
      base.facturas,
      base.cobrosPorFactura,
      filas.empresas,
      base.contexto,
      tnaAnual,
      new Date(dia),
    )
  }, [filas, base, tnaAnual, dia])

  return { datos, contexto: base?.contexto, sinCotizacion: base?.sinCotizacion ?? 0, estado }
}

export function useAcciones(hoy: Date) {
  const { filas, base, estado } = useCartera(hoy)

  const datos = useMemo(() => {
    if (!filas || !base) return undefined

    return {
      acciones: armarAcciones(filas, base.contexto),
      campanias: armarCampanias(filas, base.contexto),
    }
  }, [filas, base])

  return { datos, filas, contexto: base?.contexto, estado }
}
