/**
 * Embudo de pipeline por etapa.
 *
 * El orden es el del proceso comercial, nunca el del monto: en un embudo, el orden **es**
 * la informacion (skill `charts-crm` §7). Se muestran dos series por etapa, el monto
 * total y el ponderado por la probabilidad de cierre, para que se vea cuanto descuenta
 * cada etapa.
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
  RADIO_BARRA_HORIZONTAL,
  ejeImporte,
} from '@/components/charts/utilidades'
import type { TramoEmbudo } from '@/lib/agregados/tipos'
import { formatearCantidad, formatearImporte, formatearPorcentaje } from '@/lib/formato'

export function GraficoEmbudo({
  tramos,
  estado,
  onReintentar,
}: {
  tramos: readonly TramoEmbudo[]
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const tramo = tramos.find((item) => item.etiqueta === props.label)
    if (!tramo) return null

    return (
      <CajaTooltip
        titulo={tramo.etiqueta}
        lineas={[
          {
            nombre: 'Monto en la etapa',
            valor: formatearImporte(tramo.montoCentavos),
            tipoValor: 'nominal · ARS',
            color: 'var(--chart-1)',
          },
          {
            nombre: 'Ponderado por probabilidad',
            valor: formatearImporte(tramo.montoPonderadoCentavos),
            tipoValor: 'nominal · ARS',
            color: 'var(--chart-8)',
          },
        ]}
        pie={`${formatearCantidad(tramo.cantidad)} oportunidades · probabilidad de cierre ${formatearPorcentaje(tramo.probabilidad, 0)}`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Embudo de pipeline por etapa"
      subtitulo="Oportunidades abiertas, en orden del proceso comercial. Importes nominales en ARS."
      estado={estado}
      mensajeVacio="No hay oportunidades abiertas: todas están ganadas o perdidas. Cargá una oportunidad nueva desde Pipeline."
      onReintentar={onReintentar}
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO}>
        <BarChart data={[...tramos]} layout="vertical" margin={{ ...MARGEN, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={ejeImporte}
            axisLine={false}
            tickLine={false}
            {...EJE}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={104}
            axisLine={false}
            tickLine={false}
            {...EJE}
          />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Legend verticalAlign="bottom" height={32} />

          <Bar
            dataKey="montoCentavos"
            name="Monto total nominal"
            fill="var(--chart-1)"
            radius={[...RADIO_BARRA_HORIZONTAL]}
          />
          <Bar
            dataKey="montoPonderadoCentavos"
            name="Ponderado por probabilidad"
            fill="var(--chart-8)"
            radius={[...RADIO_BARRA_HORIZONTAL]}
          />
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-3 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        {tramos.map((tramo) => (
          <li key={tramo.etapa} className="flex justify-between gap-2">
            <span>{tramo.etiqueta}</span>
            <span className="tabular">
              {formatearCantidad(tramo.cantidad)} oport. ·{' '}
              {formatearPorcentaje(tramo.probabilidad, 0)}
            </span>
          </li>
        ))}
      </ul>
    </ContenedorGrafico>
  )
}
