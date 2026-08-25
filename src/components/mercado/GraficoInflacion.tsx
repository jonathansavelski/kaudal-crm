/**
 * Serie de inflacion mensual del INDEC, con la acumulada de la ventana al lado.
 *
 * No es plata: son coeficientes, asi que el eje va en porcentaje con un decimal
 * (skill `charts-crm` §2). El acumulado explica por que en Kaudal el valor nominal y el
 * real no se parecen.
 */

import type { TooltipContentProps } from 'recharts'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ALTO_GRAFICO, ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import {
  CURSOR_BARRAS,
  EJE,
  MARGEN,
  RADIO_BARRA,
  ejeMes,
  ejePorcentaje,
  intervaloTicks,
} from '@/components/charts/utilidades'
import type { FilaIpc } from '@/lib/api/consultas'
import { formatearIndice, formatearMesAnio, formatearPorcentaje } from '@/lib/formato'

export function GraficoInflacion({
  serie,
  inflacionAcumulada,
  estado,
  onReintentar,
}: {
  serie: readonly FilaIpc[]
  inflacionAcumulada: number | null
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active || typeof props.label !== 'string') return null
    const punto = serie.find((item) => item.periodo === props.label)
    if (!punto) return null

    return (
      <CajaTooltip
        titulo={formatearMesAnio(punto.periodo)}
        lineas={[
          {
            nombre: 'Inflación mensual (IPC nivel general)',
            valor: formatearPorcentaje(punto.variacion_mensual),
            color: 'var(--chart-6)',
          },
        ]}
        pie={`Índice base 100 en el primer mes de la serie: ${formatearIndice(punto.indice, 1)}`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Inflación mensual"
      subtitulo="IPC nivel general del INDEC, variación mensual. Serie cargada en la base."
      estado={estado}
      mensajeVacio="No hay serie de IPC cargada. Corré npm run macro para bajarla del INDEC."
      onReintentar={onReintentar}
      aside={
        <div className="rounded-md border px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Acumulada en la ventana</p>
          <p className="tabular text-xl font-semibold">
            {formatearPorcentaje(inflacionAcumulada, 0)}
          </p>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO}>
        <BarChart data={[...serie]} margin={MARGEN}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="periodo"
            tickFormatter={ejeMes}
            interval={intervaloTicks(serie.length)}
            axisLine={false}
            tickLine={false}
            {...EJE}
          />
          <YAxis
            tickFormatter={ejePorcentaje}
            axisLine={false}
            tickLine={false}
            width={56}
            {...EJE}
          />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Bar
            dataKey="variacion_mensual"
            name="Inflación mensual"
            fill="var(--chart-6)"
            radius={[...RADIO_BARRA]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ContenedorGrafico>
  )
}
