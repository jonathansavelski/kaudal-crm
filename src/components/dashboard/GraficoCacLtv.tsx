/**
 * CAC contra LTV por canal de adquisicion, con el ratio LTV/CAC como linea sobre el eje
 * derecho y la referencia en 3, que es el umbral estandar de unit economics sanos
 * (skill `charts-crm` §7). Los canales por debajo de la linea se leen de un vistazo.
 */

import type { TooltipContentProps } from 'recharts'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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
  TRAZO,
  ejeImporte,
} from '@/components/charts/utilidades'
import { UMBRAL_LTV_CAC } from '@/lib/agregados/canales'
import type { FilaCanal } from '@/lib/agregados/tipos'
import { SIN_DATO, formatearCantidad, formatearImporte, formatearIndice } from '@/lib/formato'

/** Escala logaritmica: con ratios de 5 a 485, en lineal la referencia en 3 no se ve. */
const TICKS_RATIO = [1, 3, 10, 100, 1000]

export function GraficoCacLtv({
  filas,
  accionesSinAtribuir,
  estado,
  onReintentar,
}: {
  filas: readonly FilaCanal[]
  accionesSinAtribuir: number
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const fila = filas.find((item) => item.etiqueta === props.label)
    if (!fila) return null

    return (
      <CajaTooltip
        titulo={fila.etiqueta}
        lineas={[
          {
            nombre: 'CAC',
            valor: formatearImporte(fila.cacCentavos, 'ARS', 'sin clientes nuevos en el canal'),
            tipoValor: 'nominal · ARS',
            color: 'var(--chart-6)',
          },
          {
            nombre: 'LTV',
            valor: formatearImporte(fila.ltvCentavos, 'ARS', 'churn cero: LTV no acotado'),
            tipoValor: 'nominal · ARS',
            color: 'var(--chart-5)',
          },
          {
            nombre: 'LTV / CAC',
            valor: fila.ratio === null ? SIN_DATO : `${formatearIndice(fila.ratio, 1)} veces`,
            color: 'var(--chart-1)',
          },
        ]}
        pie={`${formatearCantidad(fila.clientesNuevos)} clientes atribuidos · costo acumulado ${formatearImporte(fila.costoCentavos)}`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="CAC contra LTV por canal"
      subtitulo={`Importes nominales en ARS sobre el eje izquierdo. El ratio va en el eje derecho, en escala logarítmica, con la referencia punteada en LTV/CAC = ${UMBRAL_LTV_CAC}.`}
      estado={estado}
      mensajeVacio="Ningún canal tiene a la vez costo de adquisición y clientes atribuidos, así que no hay CAC que comparar."
      onReintentar={onReintentar}
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO}>
        <ComposedChart data={[...filas]} margin={{ ...MARGEN, left: 12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="etiqueta"
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={54}
            {...EJE}
          />
          <YAxis
            yAxisId="plata"
            tickFormatter={ejeImporte}
            axisLine={false}
            tickLine={false}
            width={72}
            {...EJE}
          />
          <YAxis
            yAxisId="ratio"
            orientation="right"
            scale="log"
            domain={[1, 1000]}
            ticks={TICKS_RATIO}
            axisLine={false}
            tickLine={false}
            width={48}
            {...EJE}
          />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Legend verticalAlign="bottom" height={32} />

          <Bar
            yAxisId="plata"
            dataKey="cacCentavos"
            name="CAC nominal"
            fill="var(--chart-6)"
            radius={[...RADIO_BARRA]}
          />
          <Bar
            yAxisId="plata"
            dataKey="ltvCentavos"
            name="LTV nominal"
            fill="var(--chart-5)"
            radius={[...RADIO_BARRA]}
          />
          <Line
            yAxisId="ratio"
            type="monotone"
            dataKey="ratio"
            name="LTV / CAC (eje derecho, escala logarítmica)"
            stroke="var(--chart-1)"
            strokeWidth={TRAZO}
            dot={{ r: 3 }}
            connectNulls
          />
          <ReferenceLine
            yAxisId="ratio"
            y={UMBRAL_LTV_CAC}
            stroke="var(--negativo)"
            strokeDasharray="6 4"
            label={{ value: `LTV/CAC = ${UMBRAL_LTV_CAC}`, position: 'insideTopRight', fontSize: 11, fill: 'var(--negativo)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {accionesSinAtribuir > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatearCantidad(accionesSinAtribuir)} acciones comerciales quedaron fuera del CAC: no
          tienen campaña ni oportunidad que permita atribuirlas a un canal.
        </p>
      ) : null}
    </ContenedorGrafico>
  )
}
