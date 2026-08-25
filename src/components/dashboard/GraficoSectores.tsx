/**
 * Facturacion de los ultimos 12 meses por sector, con el HHI de concentracion al lado.
 *
 * Maximo siete porciones mas "otros": una torta de veinte no comunica nada
 * (skill `charts-crm` §7). El HHI va **al lado**, no adentro de la torta, porque no mide
 * lo mismo: la torta reparte por sector y el HHI mide concentracion por cliente.
 */

import type { TooltipContentProps } from 'recharts'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ALTO_GRAFICO, ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import { Badge } from '@/components/ui/badge'
import type { PorcionSector } from '@/lib/agregados/tipos'
import { ETIQUETA_LECTURA_HHI } from '@/lib/etiquetas'
import { formatearCantidad, formatearImporte, formatearIndice, formatearPorcentaje } from '@/lib/formato'
import type { LecturaHhi } from '@/lib/metricas/tipos'

const COLORES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
]

function color(indice: number): string {
  return COLORES[indice % COLORES.length] ?? 'var(--neutro)'
}

function CarteleraHhi({ hhi, lectura }: { hhi: number | null; lectura: LecturaHhi | null }) {
  return (
    <div className="rounded-md border px-3 py-2 text-right">
      <p className="text-xs text-muted-foreground">HHI por cliente</p>
      <p className="tabular text-xl font-semibold">{formatearIndice(hhi)}</p>
      {lectura ? (
        <Badge variant="secondary" className="mt-1">
          {ETIQUETA_LECTURA_HHI[lectura]}
        </Badge>
      ) : null}
    </div>
  )
}

export function GraficoSectores({
  porciones,
  hhi,
  lecturaHhi,
  estado,
  onReintentar,
}: {
  porciones: readonly PorcionSector[]
  hhi: number | null
  lecturaHhi: LecturaHhi | null
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const renderTooltip = (props: TooltipContentProps) => {
    const nombre = props.payload?.[0]?.name
    if (!props.active || typeof nombre !== 'string') return null

    const indice = porciones.findIndex((item) => item.etiqueta === nombre)
    const porcion = porciones[indice]
    if (!porcion) return null

    return (
      <CajaTooltip
        titulo={porcion.etiqueta}
        lineas={[
          {
            nombre: 'Facturación de 12 meses',
            valor: formatearImporte(porcion.facturacionCentavos),
            tipoValor: 'nominal · ARS',
            color: color(indice),
          },
        ]}
        pie={`${formatearPorcentaje(porcion.participacion)} del total · ${formatearCantidad(porcion.cantidadClientes)} clientes`}
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Facturación por sector"
      subtitulo="Últimos 12 meses, importes nominales en ARS normalizados al MEP de cada factura."
      estado={estado}
      mensajeVacio="No hubo facturación en los últimos 12 meses, así que no hay reparto por sector."
      onReintentar={onReintentar}
      aside={<CarteleraHhi hhi={hhi} lectura={lecturaHhi} />}
    >
      <ResponsiveContainer width="100%" height={ALTO_GRAFICO}>
        <PieChart>
          <Pie
            data={[...porciones]}
            dataKey="facturacionCentavos"
            nameKey="etiqueta"
            innerRadius={54}
            outerRadius={96}
            paddingAngle={1}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {porciones.map((porcion, indice) => (
              <Cell key={porcion.sector} fill={color(indice)} />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend verticalAlign="bottom" height={64} />
        </PieChart>
      </ResponsiveContainer>
    </ContenedorGrafico>
  )
}
