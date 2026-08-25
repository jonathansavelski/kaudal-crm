/**
 * Paginado, **siempre**, aunque entren doce filas (rule `ui.md` §2), con el contador de
 * filtrados sobre el total al lado.
 */

import type { RowData } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import type { TablaKaudal } from '@/components/tabla/nucleo'
import { TAMANIOS_PAGINA } from '@/components/tabla/nucleo'
import { Button } from '@/components/ui/button'
import { formatearCantidad } from '@/lib/formato'

export function PaginadoTabla<TData extends RowData>({
  tabla,
  sustantivoPlural,
}: {
  tabla: TablaKaudal<TData>
  sustantivoPlural: string
}) {
  const paginas = Math.max(1, tabla.getPageCount())
  const paginaActual = tabla.state.pagination.pageIndex + 1
  const filas = tabla.getRowCount()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <label htmlFor="tamanio-pagina" className="whitespace-nowrap">
          Filas por página
        </label>
        <select
          id="tamanio-pagina"
          value={tabla.state.pagination.pageSize}
          onChange={(evento) => tabla.setPageSize(Number(evento.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {TAMANIOS_PAGINA.map((tamanio) => (
            <option key={tamanio} value={tamanio}>
              {tamanio}
            </option>
          ))}
        </select>
      </div>

      <p className="tabular text-muted-foreground" aria-live="polite">
        Página {formatearCantidad(paginaActual)} de {formatearCantidad(paginas)} ·{' '}
        {formatearCantidad(filas)} {sustantivoPlural} en la vista
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => tabla.firstPage()}
          disabled={!tabla.getCanPreviousPage()}
          aria-label="Primera página"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => tabla.previousPage()}
          disabled={!tabla.getCanPreviousPage()}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => tabla.nextPage()}
          disabled={!tabla.getCanNextPage()}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => tabla.lastPage()}
          disabled={!tabla.getCanNextPage()}
          aria-label="Última página"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
