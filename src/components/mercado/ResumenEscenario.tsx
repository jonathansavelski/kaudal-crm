/**
 * Las tres lecturas del escenario simulado, contra el escenario base.
 *
 * Presentacional puro: recibe los dos resultados ya calculados por `simularEscenario`.
 */

import { ArrowRight, Coins, Landmark, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { ResultadoEscenario } from '@/lib/agregados/escenarios'
import { formatearImporte, formatearPorcentaje } from '@/lib/formato'

function Comparacion({
  titulo,
  icono: Icono,
  base,
  simulado,
  tipoValor,
  detalle,
}: {
  titulo: string
  icono: LucideIcon
  base: string
  simulado: string
  tipoValor: string
  detalle: string
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icono className="size-4" aria-hidden />
          {titulo}
        </h3>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="tabular text-sm text-muted-foreground line-through decoration-1">
            {base}
          </span>
          <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          <span className="tabular text-2xl leading-tight font-semibold">{simulado}</span>
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground">{tipoValor}</p>
        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  )
}

export function ResumenEscenario({
  base,
  simulado,
  mesesHastaCobro,
}: {
  base: ResultadoEscenario
  simulado: ResultadoEscenario
  mesesHastaCobro: number
}) {
  const meses = Math.round(mesesHastaCobro * 10) / 10

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Comparacion
        titulo="Valor real de la cartera"
        icono={Coins}
        base={formatearImporte(base.carteraRealCentavos)}
        simulado={formatearImporte(simulado.carteraRealCentavos)}
        tipoValor="real, a poder adquisitivo de hoy"
        detalle={`Descontando ${meses} meses de espera hasta el cobro. Se licúan ${formatearImporte(simulado.perdidaRealCentavos)}.`}
      />

      <Comparacion
        titulo="Forecast a 6 meses"
        icono={TrendingDown}
        base={formatearImporte(base.forecastRealCentavos[6])}
        simulado={formatearImporte(simulado.forecastRealCentavos[6])}
        tipoValor="real, a poder adquisitivo de hoy"
        detalle={`Nominal simulado: ${formatearImporte(simulado.forecastNominalCentavos[6])}. Las oportunidades en USD se revalúan con el salto del MEP.`}
      />

      <Comparacion
        titulo="Exposición cambiaria"
        icono={Landmark}
        base={formatearPorcentaje(base.exposicionArs)}
        simulado={formatearPorcentaje(simulado.exposicionArs)}
        tipoValor="de la cartera denominada en pesos"
        detalle={`Esa porción pierde ${formatearPorcentaje(simulado.caidaPorMep)} de su valor en dólares con este salto del MEP.`}
      />
    </div>
  )
}
