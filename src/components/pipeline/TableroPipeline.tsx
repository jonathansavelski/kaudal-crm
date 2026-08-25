/**
 * Tablero por etapa de `/pipeline`: una columna por etapa del embudo, en el orden del
 * proceso comercial y nunca por monto — el orden es la informacion.
 *
 * Tres estados propios, como cualquier tabla o grafico (rule `ui.md` §1): cargando con
 * skeleton de la forma real, vacio con su explicacion, y error con reintentar.
 */

import type { ReactNode } from 'react'
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'

import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { TarjetaOportunidad } from '@/components/pipeline/TarjetaOportunidad'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ColumnaEtapa, OportunidadVista } from '@/lib/agregados/pipeline'
import { ETAPAS_ABIERTAS, ETIQUETA_ETAPA } from '@/lib/etiquetas'
import { formatearCantidad, formatearImporte, formatearPorcentaje } from '@/lib/formato'

function Encabezado({ columna }: { columna: ColumnaEtapa }) {
  return (
    <div className="sticky top-0 z-10 rounded-t-lg border-b bg-card px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{columna.etiqueta}</h3>
        <span className="tabular text-xs text-muted-foreground">
          {formatearCantidad(columna.cantidad)}
        </span>
      </div>

      <p className="tabular mt-1 text-sm font-medium">{formatearImporte(columna.totalCentavos)}</p>
      <p className="text-xs text-muted-foreground">nominal · ARS</p>

      <p className="tabular mt-1.5 border-t pt-1.5 text-xs text-muted-foreground">
        Ponderado {formatearImporte(columna.totalPonderadoCentavos)} ·{' '}
        {formatearPorcentaje(columna.probabilidad, 0)} de cierre
      </p>
    </div>
  )
}

function Envoltorio({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">{children}</div>
  )
}

export function TableroPipeline({
  columnas,
  estado,
  hayFiltros,
  onLimpiarFiltros,
  onReintentar,
  onAbrir,
}: {
  columnas: readonly ColumnaEtapa[]
  estado: EstadoPanel
  hayFiltros: boolean
  onLimpiarFiltros: () => void
  onReintentar: () => void
  onAbrir: (oportunidad: OportunidadVista) => void
}) {
  if (estado === 'cargando') {
    return (
      <Envoltorio>
        {ETAPAS_ABIERTAS.map((etapa) => (
          <Card key={etapa} className="min-w-0 gap-0 p-3" aria-busy="true">
            <span className="sr-only">Cargando {ETIQUETA_ETAPA[etapa]}</span>
            <Skeleton className="mb-1 h-4 w-24" />
            <Skeleton className="mb-3 h-6 w-32" />
            <div className="space-y-2">
              {[0, 1, 2].map((indice) => (
                <Skeleton key={indice} className="h-24 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </Envoltorio>
    )
  }

  if (estado === 'error') {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <TriangleAlert className="size-6 text-negativo" aria-hidden />
        <p className="text-sm font-medium">No pudimos traer el pipeline.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Puede ser la conexión con Supabase. Nada se perdió: volvé a intentar.
        </p>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      </Card>
    )
  }

  if (estado === 'vacio') {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <Inbox className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Ninguna oportunidad abierta para mostrar.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {hayFiltros
            ? 'Ninguna oportunidad cumple los filtros. Probá ampliar el rango de monto o quitar el filtro de owner.'
            : 'No hay oportunidades abiertas en el pipeline: todas están ganadas o perdidas.'}
        </p>
        {hayFiltros ? (
          <Button variant="outline" size="sm" onClick={onLimpiarFiltros}>
            Limpiar filtros
          </Button>
        ) : null}
      </Card>
    )
  }

  return (
    <Envoltorio>
      {columnas.map((columna) => (
        <Card key={columna.etapa} className="min-w-0 gap-0 overflow-hidden py-0">
          <Encabezado columna={columna} />

          <div className="max-h-[32rem] space-y-2 overflow-y-auto p-2">
            {columna.oportunidades.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                Sin oportunidades en {columna.etiqueta.toLowerCase()} con los filtros actuales.
              </p>
            ) : (
              columna.oportunidades.map((oportunidad) => (
                <TarjetaOportunidad
                  key={oportunidad.id}
                  oportunidad={oportunidad}
                  onAbrir={() => onAbrir(oportunidad)}
                />
              ))
            )}
          </div>
        </Card>
      ))}
    </Envoltorio>
  )
}
