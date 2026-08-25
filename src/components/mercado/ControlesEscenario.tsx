/**
 * Los dos sliders del simulador. Componente presentacional: recibe los valores y avisa
 * cuando cambian; el estado vive en la URL, en `Simulador`.
 */

import { ArrowRight, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { formatearImporte, formatearPorcentaje } from '@/lib/formato'

export const MAX_SALTO_MEP = 100
export const MAX_INFLACION_MENSUAL = 15
export const PASO_INFLACION = 0.5

function primerValor(valores: number[], porDefecto: number): number {
  return valores[0] ?? porDefecto
}

export function ControlesEscenario({
  saltoMepPct,
  inflacionMensualPct,
  mepBaseCentavos,
  mepSimuladoCentavos,
  onSaltoMep,
  onInflacion,
  onReiniciar,
}: {
  saltoMepPct: number
  inflacionMensualPct: number
  mepBaseCentavos: number
  mepSimuladoCentavos: number
  onSaltoMep: (valor: number) => void
  onInflacion: (valor: number) => void
  onReiniciar: () => void
}) {
  const sinCambios = saltoMepPct === 0 && inflacionMensualPct === 0

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor="salto-mep">Salto del dólar MEP</Label>
          <span className="tabular text-sm font-semibold">
            +{formatearPorcentaje(saltoMepPct / 100, 0)}
          </span>
        </div>
        <Slider
          id="salto-mep"
          min={0}
          max={MAX_SALTO_MEP}
          step={1}
          value={[saltoMepPct]}
          onValueChange={(valores) => onSaltoMep(primerValor(valores, 0))}
          aria-label="Salto del dólar MEP, en porcentaje"
        />
        <p className="tabular mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {formatearImporte(mepBaseCentavos)}
          <ArrowRight className="size-3.5" aria-label="pasa a" />
          {formatearImporte(mepSimuladoCentavos)} por dólar
        </p>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor="inflacion-mensual">Inflación mensual esperada</Label>
          <span className="tabular text-sm font-semibold">
            {formatearPorcentaje(inflacionMensualPct / 100)}
          </span>
        </div>
        <Slider
          id="inflacion-mensual"
          min={0}
          max={MAX_INFLACION_MENSUAL}
          step={PASO_INFLACION}
          value={[inflacionMensualPct]}
          onValueChange={(valores) => onInflacion(primerValor(valores, 0))}
          aria-label="Inflación mensual esperada, en porcentaje"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Se compone mes a mes hasta el cobro: no es lo mismo un 5% por seis meses que un 30%.
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={onReiniciar} disabled={sinCambios}>
        <RotateCcw className="size-4" aria-hidden />
        Volver al escenario base
      </Button>
    </div>
  )
}
