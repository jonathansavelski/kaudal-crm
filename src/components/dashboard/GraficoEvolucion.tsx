/**
 * Evolucion de facturacion y MRR a 24 meses, en valor nominal y en valor real.
 *
 * Es el grafico que sostiene la tesis del proyecto: con casi 500% de inflacion
 * acumulada en la ventana, la linea nominal y la real cuentan historias distintas.
 * **Nominal va solida y real punteada**: el color no es el unico portador de la
 * informacion (rule `ui.md` §5, skill `charts-crm` §1).
 */

import type { TooltipContentProps } from 'recharts'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ALTO_GRAFICO_GRANDE, ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import {
  CURSOR_LINEAS,
  EJE,
  MARGEN,
  TRAZO,
  ejeImporte,
  ejeMes,
  intervaloTicks,
} from '@/components/charts/utilidades'
import type { PuntoSerieMensual } from '@/lib/agregados/tipos'
import {
  etiquetaTipoValor,
  formatearCantidad,
  formatearImporte,
  formatearMesAnio,
} from '@/lib/formato'

export function GraficoEvolucion({
  serie,
  mesBase,
  estado,
  onReintentar,
}: {
  serie: readonly PuntoSerieMensual[]
  mesBase?: Date
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const etiquetaReal = etiquetaTipoValor('real', mesBase)

  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const punto = serie.find((item) => item.periodo === props.label)
    if (!punto) return null

    return (
      <CajaTooltip
        titulo={formatearMesAnio(punto.periodo)}
        lineas={[
          {
            nombre: 'Facturación',
            valor: formatearImporte(punto.facturacionNominalCentavos),
            tipoValor: 'nominal',
            color: 'var(--nominal)',
          },
          {
            nombre: 'Facturación',
            valor: formatearImporte(punto.facturacionRealCentavos),
            tipoValor: etiquetaReal,
            color: 'var(--real)',
          },
          {
            nombre: 'MRR',
            valor: formatearImporte(punto.mrrNominalCentavos),
            tipoValor: 'nominal',
            color: 'var(--chart-3)',
          },
          {
            nombre: 'MRR',
            valor: formatearImporte(punto.mrrRealCentavos),
            tipoValor: etiquetaReal,
            color: 'var(--chart-7)',
          },
        ]}
        pie={`${formatearCantidad(punto.cantidadFacturas)} facturas emitidas en el mes`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Evolución de facturación y MRR"
      subtitulo={`Últimos ${serie.length || 24} meses. Línea sólida: nominal. Línea punteada: ${etiquetaReal}.`}
      altura={ALTO_GRAFICO_GRANDE}
      estado={estado}
      mensajeVacio="No hay facturas ni contratos en los últimos 24 meses, así que no hay serie que dibujar."
      onReintentar={onReintentar}
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO_GRANDE}>
        <LineChart data={[...serie]} margin={{ ...MARGEN, left: 16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="periodo"
            tickFormatter={ejeMes}
            interval={intervaloTicks(serie.length)}
            axisLine={false}
            tickLine={false}
            {...EJE}
          />
          <YAxis tickFormatter={ejeImporte} axisLine={false} tickLine={false} width={78} {...EJE} />
          <Tooltip content={renderTooltip} cursor={CURSOR_LINEAS} />
          <Legend verticalAlign="bottom" height={44} />

          <Line
            type="monotone"
            dataKey="facturacionNominalCentavos"
            name="Facturación nominal"
            stroke="var(--nominal)"
            strokeWidth={TRAZO}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="facturacionRealCentavos"
            name={`Facturación ${etiquetaReal}`}
            stroke="var(--real)"
            strokeWidth={TRAZO}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="mrrNominalCentavos"
            name="MRR nominal"
            stroke="var(--chart-3)"
            strokeWidth={TRAZO}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="mrrRealCentavos"
            name={`MRR ${etiquetaReal}`}
            stroke="var(--chart-7)"
            strokeWidth={TRAZO}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ContenedorGrafico>
  )
}
