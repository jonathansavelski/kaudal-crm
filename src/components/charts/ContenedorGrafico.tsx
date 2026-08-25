/**
 * Card de grafico con sus cuatro estados (rule `ui.md` §1 y §3, skill `charts-crm` §6).
 *
 *  - **cargando**: skeleton con la forma del grafico, del mismo alto. Nunca un spinner
 *    suelto ni un salto de layout.
 *  - **error**: "no pudimos traer los datos" + reintentar. Distinto de vacio.
 *  - **vacio**: por que no hay datos y que hacer.
 *  - **listo**: el grafico.
 */

import type { ReactNode } from 'react'
import { ChartColumnBig, RefreshCw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export type EstadoPanel = 'cargando' | 'error' | 'vacio' | 'listo'

/** Alturas del skill: 300 px de base, 360 px para el grafico grande de evolucion. */
export const ALTO_GRAFICO = 300
export const ALTO_GRAFICO_GRANDE = 360

const ALTURAS_BARRAS = [45, 70, 55, 85, 62, 92, 74, 100, 66, 88]

function EsqueletoGrafico({ altura }: { altura: number }) {
  return (
    <div className="flex flex-col gap-2" style={{ height: altura }} aria-hidden>
      <div className="flex flex-1 items-end gap-2 border-b border-l pb-0 pl-2">
        {ALTURAS_BARRAS.map((porcentaje, indice) => (
          <Skeleton
            key={indice}
            className="flex-1 rounded-t-[4px] rounded-b-none"
            style={{ height: porcentaje + '%' }}
          />
        ))}
      </div>
      <div className="flex justify-between pl-2">
        {[0, 1, 2, 3, 4].map((indice) => (
          <Skeleton key={indice} className="h-3 w-10" />
        ))}
      </div>
    </div>
  )
}

function Centrado({ altura, children }: { altura: number; children: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-center"
      style={{ minHeight: altura }}
    >
      {children}
    </div>
  )
}

export function ContenedorGrafico({
  titulo,
  subtitulo,
  altura = ALTO_GRAFICO,
  estado,
  mensajeVacio,
  sugerencia,
  onReintentar,
  aside,
  children,
}: {
  titulo: string
  subtitulo?: string
  altura?: number
  estado: EstadoPanel
  /** Por que no hay datos. "Sin resultados" no alcanza. */
  mensajeVacio?: string
  /** Que hacer al respecto. */
  sugerencia?: ReactNode
  onReintentar?: () => void
  /** Contenido al costado del titulo: el HHI de la torta de sectores, por ejemplo. */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    // min-w-0: un item de grilla no baja del ancho intrinseco de su contenido, y
    // Recharts reporta uno grande. Sin esto la card no se achica en tablet y el body
    // termina con scroll horizontal, que la rule ui.md no permite.
    <Card className="min-w-0 gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base leading-tight font-semibold">{titulo}</h3>
            {subtitulo ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="px-5">
        {estado === 'cargando' ? (
          <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando {titulo}</span>
            <EsqueletoGrafico altura={altura} />
          </div>
        ) : null}

        {estado === 'error' ? (
          <Centrado altura={altura}>
            <TriangleAlert className="size-6 text-negativo" aria-hidden />
            <p className="text-sm font-medium">No pudimos traer los datos de este gráfico.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Puede ser la conexión con Supabase. El resto de la pantalla sigue funcionando.
            </p>
            {onReintentar ? (
              <Button variant="outline" size="sm" onClick={onReintentar}>
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>
            ) : null}
          </Centrado>
        ) : null}

        {estado === 'vacio' ? (
          <Centrado altura={altura}>
            <ChartColumnBig className="size-6 text-muted-foreground" aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              {mensajeVacio ?? 'Sin datos para mostrar en este gráfico.'}
            </p>
            {sugerencia}
          </Centrado>
        ) : null}

        {estado === 'listo' ? children : null}
      </CardContent>
    </Card>
  )
}
