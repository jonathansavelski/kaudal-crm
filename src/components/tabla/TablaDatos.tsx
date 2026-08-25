/**
 * La tabla de Kaudal. Una sola implementacion para las cuatro pantallas.
 *
 * Cuatro estados, ninguno opcional (rule `ui.md` §1):
 *  - **cargando**: skeleton con la forma real de la tabla.
 *  - **error**: "no pudimos traer los datos" + reintentar. Distinto de vacio.
 *  - **vacio**: por que no hay filas y que hacer, con su accion.
 *  - **listo**: filas, orden, paginado.
 *
 * El scroll horizontal vive **adentro** del contenedor (`overflow-x-auto` sobre un
 * `min-w-0`), nunca empujando la pagina.
 */

import type { ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'

import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { EsqueletoTabla } from '@/components/tabla/EsqueletoTabla'
import type { TablaKaudal } from '@/components/tabla/nucleo'
import { ariaSort } from '@/components/tabla/nucleo'
import { PaginadoTabla } from '@/components/tabla/PaginadoTabla'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function TablaDatos<TData extends RowData>({
  tabla,
  estado,
  sustantivoPlural,
  mensajeVacio,
  accionVacio,
  onReintentar,
  onFilaClick,
  etiquetaFila,
  barra,
  pie,
}: {
  tabla: TablaKaudal<TData>
  estado: EstadoPanel
  /** `cuentas`, `facturas`, `acciones`. Va en el paginado y en el aviso de vacio. */
  sustantivoPlural: string
  /** Por que no hay filas y que hacer. "Sin resultados" no alcanza. */
  mensajeVacio: string
  accionVacio?: ReactNode
  onReintentar?: () => void
  /** Si esta, la fila entera es clickeable y se nota. */
  onFilaClick?: (fila: TData) => void
  etiquetaFila?: (fila: TData) => string
  /** Filtros, buscador, selector de columnas y exportar. */
  barra?: ReactNode
  pie?: ReactNode
}) {
  const columnasVisibles = tabla.getVisibleLeafColumns()
  const formaSkeleton = columnasVisibles.map((columna) => ({
    id: columna.id,
    alineacion: columna.columnDef.meta?.alineacion,
  }))

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      {barra ? <div className="border-b px-3 py-3">{barra}</div> : null}

      {estado === 'cargando' ? (
        <div className="px-3 py-2">
          <EsqueletoTabla columnas={formaSkeleton} />
        </div>
      ) : null}

      {estado === 'error' ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <TriangleAlert className="size-6 text-negativo" aria-hidden />
          <p className="text-sm font-medium">No pudimos traer los datos de esta tabla.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Puede ser la conexión con Supabase. Los datos que ya están en pantalla siguen siendo
            los últimos que trajimos.
          </p>
          {onReintentar ? (
            <Button variant="outline" size="sm" onClick={onReintentar}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {estado === 'vacio' ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Ninguna fila para mostrar.</p>
          <p className="max-w-md text-sm text-muted-foreground">{mensajeVacio}</p>
          {accionVacio}
        </div>
      ) : null}

      {estado === 'listo' ? (
        <>
          {/* El scroll ancho pasa acá adentro, no en el body (rule ui.md §7). */}
          {/*
            `relative` no es decorativo: las etiquetas `sr-only` de los encabezados
            ordenables son `position: absolute`, y sin un ancestro posicionado su
            bloque contenedor es el documento. Entonces escapan de este contenedor,
            su posicion dentro de la tabla ancha estira el area scrolleable del html
            y la pagina entera termina scrolleando en horizontal, que es justo lo que
            la rule ui.md no permite. Con `relative` quedan contenidas y recortadas aca.
          */}
          <div className="relative min-w-0 overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <caption className="sr-only">
                Tabla de {sustantivoPlural}. Cada encabezado ordena por su columna.
              </caption>
              <thead className="bg-muted/50">
                {tabla.getHeaderGroups().map((grupo) => (
                  <tr key={grupo.id} className="border-b">
                    {grupo.headers.map((encabezado) => (
                      <th
                        key={encabezado.id}
                        scope="col"
                        aria-sort={ariaSort(encabezado.column.getIsSorted())}
                        className={cn(
                          'px-3 py-2.5 text-left align-middle font-medium whitespace-nowrap',
                          encabezado.column.columnDef.meta?.alineacion === 'derecha' && 'text-right',
                        )}
                      >
                        <tabla.FlexRender header={encabezado} />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {tabla.getRowModel().rows.map((fila) => (
                  <tr
                    key={fila.id}
                    onClick={onFilaClick ? () => onFilaClick(fila.original) : undefined}
                    onKeyDown={
                      onFilaClick
                        ? (evento) => {
                            if (evento.key === 'Enter' || evento.key === ' ') {
                              evento.preventDefault()
                              onFilaClick(fila.original)
                            }
                          }
                        : undefined
                    }
                    tabIndex={onFilaClick ? 0 : undefined}
                    role={onFilaClick ? 'button' : undefined}
                    aria-label={onFilaClick && etiquetaFila ? etiquetaFila(fila.original) : undefined}
                    className={cn(
                      'border-b last:border-b-0',
                      onFilaClick &&
                        'cursor-pointer transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    )}
                  >
                    {fila.getVisibleCells().map((celda) => (
                      <td
                        key={celda.id}
                        className={cn(
                          'px-3 py-2.5 align-middle',
                          celda.column.columnDef.meta?.alineacion === 'derecha' &&
                            'tabular text-right',
                        )}
                      >
                        <tabla.FlexRender cell={celda} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginadoTabla tabla={tabla} sustantivoPlural={sustantivoPlural} />
        </>
      ) : null}

      {pie}
    </Card>
  )
}
