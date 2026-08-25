/**
 * Aging con drill-down: una barra por bucket y, al hacer click, la tabla de abajo queda
 * filtrada por ese bucket.
 *
 * Los buckets van siempre en el mismo orden y con los mismos colores (skill
 * `charts-crm` §1). El bucket seleccionado se distingue por **texto** ademas de por
 * opacidad: el color no es el unico portador (rule `ui.md` §5).
 */

import type { TooltipContentProps } from 'recharts'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import { CURSOR_BARRAS, EJE, MARGEN, RADIO_BARRA, ejeImporte } from '@/components/charts/utilidades'
import { Button } from '@/components/ui/button'
import type { PorcionAging } from '@/lib/agregados/tipos'
import { COLOR_BUCKET, ETIQUETA_BUCKET } from '@/lib/etiquetas'
import { formatearCantidad, formatearImporte, formatearPorcentaje } from '@/lib/formato'

const ALTO = 300

/** Etiquetas cortas para el eje X: la etiqueta completa va en el tooltip. */
const CORTA: Readonly<Record<string, string>> = {
  corriente: 'Corriente',
  '1-30': '1 a 30',
  '31-60': '31 a 60',
  '61-90': '61 a 90',
  '+90': 'Más de 90',
  incobrable: 'Incobrable',
}

export function GraficoAgingDrill({
  porciones,
  seleccionado,
  estado,
  onSeleccionar,
  onReintentar,
}: {
  porciones: readonly PorcionAging[]
  seleccionado: string
  estado: EstadoPanel
  onSeleccionar: (bucket: string) => void
  onReintentar: () => void
}) {
  const datos = porciones.map((porcion) => ({
    bucket: porcion.bucket,
    etiqueta: CORTA[porcion.bucket] ?? porcion.bucket,
    saldo: porcion.saldoCentavos,
    cantidad: porcion.cantidad,
    participacion: porcion.participacion,
  }))

  const renderTooltip = (props: TooltipContentProps) => {
    const punto = datos.find((item) => item.etiqueta === props.label)
    if (!props.active || !punto) return null

    return (
      <CajaTooltip
        titulo={ETIQUETA_BUCKET[punto.bucket]}
        lineas={[
          {
            nombre: 'Saldo pendiente',
            valor: formatearImporte(punto.saldo),
            tipoValor: 'nominal · ARS',
            color: COLOR_BUCKET[punto.bucket],
          },
        ]}
        pie={`${formatearCantidad(punto.cantidad)} facturas · ${formatearPorcentaje(punto.participacion)} de la cartera. Click para filtrar la tabla.`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Aging de la cartera"
      subtitulo="Saldo pendiente por antigüedad de vencimiento, en pesos nominales. Hacé click en una barra para filtrar las facturas de abajo."
      estado={estado}
      altura={ALTO}
      mensajeVacio="No hay saldo pendiente: toda la cartera está cobrada."
      onReintentar={onReintentar}
      aside={
        seleccionado !== '' ? (
          <Button variant="outline" size="sm" onClick={() => onSeleccionar('')}>
            Ver todos los buckets
          </Button>
        ) : null
      }
    >
      <ResponsiveContainer width="100%" height={ALTO}>
        <BarChart data={datos} margin={MARGEN}>
          <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} {...EJE} />
          <YAxis tickFormatter={ejeImporte} axisLine={false} tickLine={false} width={72} {...EJE} />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />

          <Bar
            dataKey="saldo"
            name="Saldo pendiente nominal"
            radius={[...RADIO_BARRA]}
            onClick={(_barra, indice) => {
              // Recharts entrega el indice de la barra, no la fila: se resuelve contra
              // `datos`, que es el mismo array que dibujo el grafico.
              const punto = datos[indice]
              if (punto) onSeleccionar(punto.bucket === seleccionado ? '' : punto.bucket)
            }}
            className="cursor-pointer"
          >
            {datos.map((punto) => (
              <Cell
                key={punto.bucket}
                fill={COLOR_BUCKET[punto.bucket]}
                fillOpacity={seleccionado === '' || seleccionado === punto.bucket ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
        {datos.map((punto) => (
          <li key={punto.bucket}>
            <button
              type="button"
              onClick={() => onSeleccionar(punto.bucket === seleccionado ? '' : punto.bucket)}
              aria-pressed={seleccionado === punto.bucket}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-semibold"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: COLOR_BUCKET[punto.bucket] }}
              />
              {ETIQUETA_BUCKET[punto.bucket]}
              <span className="tabular text-muted-foreground">
                {formatearCantidad(punto.cantidad)}
              </span>
              {seleccionado === punto.bucket ? <span className="sr-only">(filtro activo)</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </ContenedorGrafico>
  )
}
