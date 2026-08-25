/**
 * Top 10 clientes por facturacion de 12 meses, coloreados por score de riesgo.
 *
 * El color va acompanado de la leyenda de la escala y del score en el tooltip: la
 * informacion nunca depende solo del color (rule `ui.md` §5).
 */

import type { TooltipContentProps } from 'recharts'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ALTO_GRAFICO_GRANDE, ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import {
  CURSOR_BARRAS,
  EJE,
  MARGEN,
  RADIO_BARRA_HORIZONTAL,
  ejeImporte,
  truncar,
} from '@/components/charts/utilidades'
import { ESCALA_RIESGO, colorDeScore, etiquetaDeScore } from '@/lib/agregados/clientes'
import type { ClienteRankeado } from '@/lib/agregados/tipos'
import { formatearDias, formatearImporte, formatearIndice, formatearPorcentaje } from '@/lib/formato'

function LeyendaEscala() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {ESCALA_RIESGO.map((tramo) => (
        <li key={tramo.etiqueta} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-[3px]"
            style={{ backgroundColor: tramo.color }}
          />
          {tramo.etiqueta}
        </li>
      ))}
    </ul>
  )
}

export function GraficoTopClientes({
  clientes,
  estado,
  onReintentar,
}: {
  clientes: readonly ClienteRankeado[]
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const datos = clientes.map((cliente) => ({ ...cliente, corto: truncar(cliente.razonSocial) }))

  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const cliente = datos.find((item) => item.corto === props.label)
    if (!cliente) return null

    return (
      <CajaTooltip
        titulo={cliente.razonSocial}
        lineas={[
          {
            nombre: 'Facturación de 12 meses',
            valor: formatearImporte(cliente.facturacionCentavos),
            tipoValor: 'nominal · ARS',
            color: colorDeScore(cliente.score),
          },
          {
            nombre: 'Saldo pendiente',
            valor: formatearImporte(cliente.saldoCentavos),
            tipoValor: 'nominal · ARS',
          },
          {
            nombre: 'Score de riesgo (100 es el mejor)',
            valor: `${formatearIndice(cliente.score)} · ${etiquetaDeScore(cliente.score)}`,
          },
        ]}
        pie={`${formatearPorcentaje(cliente.share)} de la facturación total · mora promedio ${formatearDias(cliente.moraPromedioDias)}`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Top 10 clientes por facturación"
      subtitulo="Últimos 12 meses. El color indica el score de riesgo; el score exacto está en el tooltip."
      altura={ALTO_GRAFICO_GRANDE}
      estado={estado}
      mensajeVacio="Ningún cliente facturó en los últimos 12 meses. Revisá el rango de datos cargado."
      onReintentar={onReintentar}
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO_GRANDE}>
        <BarChart data={datos} layout="vertical" margin={{ ...MARGEN, left: 4 }}>
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
            dataKey="corto"
            width={168}
            axisLine={false}
            tickLine={false}
            {...EJE}
          />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Bar
            dataKey="facturacionCentavos"
            name="Facturación nominal"
            radius={[...RADIO_BARRA_HORIZONTAL]}
          >
            {datos.map((cliente) => (
              <Cell key={cliente.empresaId} fill={colorDeScore(cliente.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <LeyendaEscala />
    </ContenedorGrafico>
  )
}
