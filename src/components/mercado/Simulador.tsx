/**
 * Simulador de escenarios: dos palancas, recalculo en vivo.
 *
 * El estado vive en la **URL** (`?mep=35&ipc=4`), no en `useState`: si alguien manda el
 * link, llega al mismo escenario (rule `ui.md` §6).
 *
 * Todo el calculo es de `simularEscenario`, que a su vez solo llama a funciones de
 * `src/lib/metricas/`. Este componente no hace una sola cuenta financiera.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'

import { estadoDePanel } from '@/components/charts/utilidades'
import {
  ControlesEscenario,
  MAX_INFLACION_MENSUAL,
  MAX_SALTO_MEP,
} from '@/components/mercado/ControlesEscenario'
import { GraficoEscenarios } from '@/components/mercado/GraficoEscenarios'
import { ResumenEscenario } from '@/components/mercado/ResumenEscenario'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EntradaEscenario } from '@/lib/agregados/escenarios'
import { ESCENARIO_BASE, simularEscenario } from '@/lib/agregados/escenarios'
import { formatearPorcentaje } from '@/lib/formato'

const PARAM_MEP = 'mep'
const PARAM_IPC = 'ipc'

function leerParametro(crudo: string | null, maximo: number): number {
  const valor = Number(crudo)
  if (!Number.isFinite(valor)) return 0
  return Math.min(maximo, Math.max(0, valor))
}

function Chip({ texto, onQuitar }: { texto: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium">
      {texto}
      <button
        type="button"
        onClick={onQuitar}
        className="rounded-full p-0.5 hover:bg-background"
        aria-label={`Quitar ${texto}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  )
}

export function Simulador({
  entrada,
  cargando,
  error,
}: {
  entrada?: EntradaEscenario
  cargando: boolean
  error: boolean
}) {
  const [parametros, setParametros] = useSearchParams()

  const saltoMepPct = leerParametro(parametros.get(PARAM_MEP), MAX_SALTO_MEP)
  const inflacionPct = leerParametro(parametros.get(PARAM_IPC), MAX_INFLACION_MENSUAL)

  const fijar = (clave: string, valor: number) => {
    const siguientes = new URLSearchParams(parametros)
    if (valor === 0) siguientes.delete(clave)
    else siguientes.set(clave, String(valor))
    setParametros(siguientes, { replace: true })
  }

  const escenario = useMemo(
    () => ({ saltoMep: saltoMepPct / 100, inflacionMensual: inflacionPct / 100 }),
    [saltoMepPct, inflacionPct],
  )

  const resultados = useMemo(() => {
    if (!entrada) return undefined
    return {
      base: simularEscenario(entrada, ESCENARIO_BASE),
      simulado: simularEscenario(entrada, escenario),
    }
  }, [entrada, escenario])

  const mepBase = entrada?.contexto.mepUltimoCentavos ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <h2 className="text-base font-semibold">Simulador de escenarios</h2>
            <p className="text-sm text-muted-foreground">
              Cuánto de la cartera y del pipeline sobrevive a un salto del dólar y a la inflación
              esperada.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <ControlesEscenario
              saltoMepPct={saltoMepPct}
              inflacionMensualPct={inflacionPct}
              mepBaseCentavos={mepBase}
              mepSimuladoCentavos={resultados?.simulado.mepSimuladoCentavos ?? mepBase}
              onSaltoMep={(valor) => fijar(PARAM_MEP, valor)}
              onInflacion={(valor) => fijar(PARAM_IPC, valor)}
              onReiniciar={() => {
                const siguientes = new URLSearchParams(parametros)
                siguientes.delete(PARAM_MEP)
                siguientes.delete(PARAM_IPC)
                setParametros(siguientes, { replace: true })
              }}
            />

            {saltoMepPct > 0 || inflacionPct > 0 ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {saltoMepPct > 0 ? (
                  <Chip
                    texto={`MEP +${formatearPorcentaje(saltoMepPct / 100, 0)}`}
                    onQuitar={() => fijar(PARAM_MEP, 0)}
                  />
                ) : null}
                {inflacionPct > 0 ? (
                  <Chip
                    texto={`Inflación ${formatearPorcentaje(inflacionPct / 100)} mensual`}
                    onQuitar={() => fijar(PARAM_IPC, 0)}
                  />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {resultados ? (
          <GraficoEscenarios
            base={resultados.base}
            simulado={resultados.simulado}
            estado={estadoDePanel({
              cargando,
              error,
              vacio: resultados.base.carteraNominalCentavos === 0,
            })}
          />
        ) : (
          <GraficoEscenarios
            base={ESCENARIO_VACIO}
            simulado={ESCENARIO_VACIO}
            estado={estadoDePanel({ cargando, error, vacio: false })}
          />
        )}
      </div>

      {resultados ? (
        <ResumenEscenario
          base={resultados.base}
          simulado={resultados.simulado}
          mesesHastaCobro={resultados.simulado.mesesHastaCobro}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((indice) => (
            <Skeleton key={indice} className="h-36 w-full" />
          ))}
        </div>
      )}
    </div>
  )
}

/** Solo para que el grafico pueda pintar su skeleton sin datos todavia. */
const ESCENARIO_VACIO = {
  carteraNominalCentavos: 0,
  carteraRealCentavos: 0,
  perdidaRealCentavos: 0,
  forecastNominalCentavos: { 3: 0, 6: 0 },
  forecastRealCentavos: { 3: 0, 6: 0 },
  exposicionArs: null,
  caidaPorMep: null,
  mesesHastaCobro: 0,
  mepSimuladoCentavos: 0,
}
