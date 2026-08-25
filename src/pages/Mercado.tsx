/**
 * `/mercado`: contexto macro y simulador de escenarios.
 *
 * Cotizaciones y riesgo país salen de APIs externas (con fallback); la inflación, de la
 * tabla `ipc_mensual`. El simulador cruza esas dos palancas contra la cartera y el
 * pipeline reales.
 */

import { useMemo } from 'react'

import { estadoDePanel } from '@/components/charts/utilidades'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { GraficoInflacion } from '@/components/mercado/GraficoInflacion'
import { PanelCotizaciones } from '@/components/mercado/PanelCotizaciones'
import { PanelRiesgoPais, PanelTasas } from '@/components/mercado/PanelMacro'
import { Simulador } from '@/components/mercado/Simulador'
import { useDatosDashboard, useFilasCrm } from '@/hooks/use-datos-dashboard'
import type { EntradaEscenario } from '@/lib/agregados/escenarios'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/mercado')

/** Sin DSO calculable se asume el plazo de pago tipico de Nodus. */
const DIAS_COBRO_POR_DEFECTO = 60

export default function Mercado() {
  const hoy = useMemo(() => new Date(), [])
  const filas = useFilasCrm()
  const { datos, isPending, isError, refetch } = useDatosDashboard(hoy)

  const entrada: EntradaEscenario | undefined = useMemo(() => {
    if (!datos || !filas.data) return undefined

    return {
      saldoArsCentavos: datos.kpis.saldoArsCentavos,
      saldoUsdNormalizadoCentavos: datos.kpis.saldoUsdNormalizadoCentavos,
      oportunidades: filas.data.oportunidades,
      contexto: datos.contexto,
      hoy,
      diasHastaCobro: datos.kpis.dsoDias ?? DIAS_COBRO_POR_DEFECTO,
    }
  }, [datos, filas.data, hoy])

  const serieIpc = filas.data?.ipc ?? []

  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />

      <div className="space-y-6">
        <PanelCotizaciones hoy={hoy} />

        <div className="grid gap-6 xl:grid-cols-[1fr_minmax(280px,380px)]">
          <GraficoInflacion
            serie={serieIpc}
            inflacionAcumulada={datos?.contexto.inflacionAcumulada ?? null}
            estado={estadoDePanel({
              cargando: isPending,
              error: isError,
              vacio: serieIpc.length === 0,
            })}
            onReintentar={() => void refetch()}
          />

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <PanelRiesgoPais />
            <PanelTasas />
          </div>
        </div>

        <Simulador entrada={entrada} cargando={isPending} error={isError} />
      </div>
    </>
  )
}
