/**
 * Aging de cuentas por cobrar: una barra apilada con los seis buckets, siempre en el
 * mismo orden y con los mismos colores (skill `charts-crm` §1).
 *
 * Debajo va el detalle en numeros, porque una barra apilada muestra la proporcion pero
 * no la cifra, y la cifra es lo que se necesita para decidir.
 */

import type { TooltipContentProps } from 'recharts'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CajaTooltip } from '@/components/charts/CajaTooltip'
import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { ContenedorGrafico } from '@/components/charts/ContenedorGrafico'
import { CURSOR_BARRAS, EJE, MARGEN, ejeImporte } from '@/components/charts/utilidades'
import type { PorcionAging } from '@/lib/agregados/tipos'
import { COLOR_BUCKET, ETIQUETA_BUCKET } from '@/lib/etiquetas'
import { formatearCantidad, formatearImporte, formatearPorcentaje } from '@/lib/formato'

/** El skill pide 260 px de alto minimo; la barra va gruesa y centrada adentro. */
const ALTO_BARRA = 260

/**
 * Recharts resuelve `dataKey` con acceso por path, asi que un bucket como `+90` o `1-30`
 * no sirve de clave directa. Se le da a cada uno un identificador plano.
 */
function claveDe(bucket: string): string {
  return 'b' + bucket.replace(/[^a-z0-9]/gi, '_')
}

export function GraficoAging({
  porciones,
  estado,
  onReintentar,
}: {
  porciones: readonly PorcionAging[]
  estado: EstadoPanel
  onReintentar?: () => void
}) {
  const fila: Record<string, number | string> = { nombre: 'Cartera' }
  for (const porcion of porciones) fila[claveDe(porcion.bucket)] = porcion.saldoCentavos

  const renderTooltip = (props: TooltipContentProps) => {
    if (!props.active) return null

    return (
      <CajaTooltip
        titulo="Saldo por antigüedad"
        lineas={porciones.map((porcion) => ({
          nombre: `${ETIQUETA_BUCKET[porcion.bucket]} · ${formatearCantidad(porcion.cantidad)} facturas`,
          valor: formatearImporte(porcion.saldoCentavos),
          tipoValor: 'nominal · ARS',
          color: COLOR_BUCKET[porcion.bucket],
        }))}
        pie="Incobrable es excluyente: una factura marcada incobrable no aparece además en +90."
      />
    )
  }

  return (
    <ContenedorGrafico
      titulo="Aging de cuentas por cobrar"
      subtitulo="Saldo pendiente por antigüedad de vencimiento. Importes nominales en ARS."
      estado={estado}
      altura={ALTO_BARRA}
      mensajeVacio="No hay saldo pendiente: toda la cartera está cobrada. Es un buen problema."
      onReintentar={onReintentar}
    >
      <ResponsiveContainer width="100%" height={ALTO_BARRA}>
        <BarChart data={[fila]} layout="vertical" margin={MARGEN} barSize={72}>
          <XAxis type="number" tickFormatter={ejeImporte} axisLine={false} tickLine={false} {...EJE} />
          <YAxis type="category" dataKey="nombre" hide />
          <Tooltip content={renderTooltip} cursor={CURSOR_BARRAS} />
          <Legend verticalAlign="bottom" height={52} />

          {porciones.map((porcion) => (
            <Bar
              key={porcion.bucket}
              dataKey={claveDe(porcion.bucket)}
              name={ETIQUETA_BUCKET[porcion.bucket]}
              stackId="aging"
              fill={COLOR_BUCKET[porcion.bucket]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-2 divide-y text-sm">
        {porciones.map((porcion) => (
          <li key={porcion.bucket} className="flex items-center gap-3 py-1.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-[3px]"
              style={{ backgroundColor: COLOR_BUCKET[porcion.bucket] }}
            />
            <span className="min-w-0 flex-1 truncate">{ETIQUETA_BUCKET[porcion.bucket]}</span>
            <span className="tabular shrink-0 text-muted-foreground">
              {formatearCantidad(porcion.cantidad)}
            </span>
            <span className="tabular w-28 shrink-0 text-right font-medium">
              {formatearImporte(porcion.saldoCentavos)}
            </span>
            <span className="tabular w-14 shrink-0 text-right text-muted-foreground">
              {formatearPorcentaje(porcion.participacion)}
            </span>
          </li>
        ))}
      </ul>
    </ContenedorGrafico>
  )
}
