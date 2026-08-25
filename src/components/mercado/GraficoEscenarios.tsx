/**
 * Comparativo escenario base contra escenario simulado.
 *
 * Las tres magnitudes se muestran **en valor real a poder adquisitivo de hoy**, que es
 * la unica forma de comparar plata que entra en momentos distintos. El escenario base
 * usa el color de referencia `--neutro` (skill `charts-crm` §1).
 */

import type { TooltipContentProps } from 'recharts'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ALTO_GRAFICO, ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import {
  CURSOR_BARRAS,
  EJE,
  MARGEN,
  RADIO_BARRA,
  ejeImporte,
} from '@/components/charts/utilidades'
import type { ResultadoEscenario } from '@/lib/agregados/escenarios'
import { formatearImporte, formatearPorcentaje } from '@/lib/formato'

type Punto = { concepto: string; base: number; simulado: number }

function armarPuntos(base: ResultadoEscenario, simulado: ResultadoEscenario): Punto[] {
  return [
    {
      concepto: 'Cartera',
      base: base.carteraRealCentavos,
      simulado: simulado.carteraRealCentavos,
    },
    {
      concepto: 'Forecast 3 meses',
      base: base.forecastRealCentavos[3] ?? 0,
      simulado: simulado.forecastRealCentavos[3] ?? 0,
    },
    {
      concepto: 'Forecast 6 meses',
      base: base.forecastRealCentavos[6] ?? 0,
      simulado: simulado.forecastRealCentavos[6] ?? 0,
    },
  ]
}

export function GraficoEscenarios({
  base,
  simulado,
  estado,
}: {
  base: ResultadoEscenario
  simulado: ResultadoEscenario
  estado: EstadoPanel
}) {
  const puntos = armarPuntos(base, simulado)

  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const punto = puntos.find((item) => item.concepto === props.label)
    if (!punto) return null

    const variacion = punto.base > 0 ? punto.simulado / punto.base - 1 : null

    return (
      <CajaTooltip
        titulo={punto.concepto}
        lineas={[
          {
            nombre: 'Escenario base (hoy)',
            valor: formatearImporte(punto.base),
            tipoValor: 'real, a poder adquisitivo de hoy',
            color: 'var(--neutro)',
          },
          {
            nombre: 'Escenario simulado',
            valor: formatearImporte(punto.simulado),
            tipoValor: 'real, a poder adquisitivo de hoy',
            color: 'var(--real)',
          },
        ]}
        pie={
          variacion === null
            ? 'Sin base contra la cual comparar.'
            : `Variación: ${formatearPorcentaje(variacion)}`
        }
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Escenario base contra escenario simulado"
      subtitulo="Todo en valor real, a poder adquisitivo de hoy. Mové los sliders para ver la brecha."
      estado={estado}
      mensajeVacio="Sin cartera ni pipeline abierto no hay escenario que simular."
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO}>
        <BarChart data={puntos} margin={{ ...MARGEN, left: 16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="concepto" axisLine={false} tickLine={false} {...EJE} />
          <YAxis tickFormatter={ejeImporte} axisLine={false} tickLine={false} width={78} {...EJE} />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Legend verticalAlign="bottom" height={32} />

          <Bar
            dataKey="base"
            name="Escenario base (hoy)"
            fill="var(--neutro)"
            radius={[...RADIO_BARRA]}
          />
          <Bar
            dataKey="simulado"
            name="Escenario simulado"
            fill="var(--real)"
            radius={[...RADIO_BARRA]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ContenedorGrafico>
  )
}
