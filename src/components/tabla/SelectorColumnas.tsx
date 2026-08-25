/**
 * Selector de columnas visibles de las tablas maestras (rule `ui.md` §2).
 *
 * Las columnas marcadas `fija` en su `meta` no aparecen: sin ellas la fila no se
 * identifica y ocultarlas deja la tabla inservible.
 */

import type { RowData } from '@tanstack/react-table'
import { Check, Columns3, RotateCcw } from 'lucide-react'

import type { TablaKaudal } from '@/components/tabla/nucleo'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function SelectorColumnas<TData extends RowData>({ tabla }: { tabla: TablaKaudal<TData> }) {
  const columnas = tabla.getAllLeafColumns().filter((columna) => columna.columnDef.meta?.fija !== true)
  const ocultas = columnas.filter((columna) => !columna.getIsVisible()).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" aria-hidden />
          Columnas
          {ocultas > 0 ? (
            <span className="tabular rounded-full bg-secondary px-1.5 text-xs">{ocultas} ocultas</span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1.5 text-sm font-semibold">Columnas visibles</p>

        <ul className="max-h-72 overflow-y-auto">
          {columnas.map((columna) => {
            const visible = columna.getIsVisible()
            return (
              <li key={columna.id}>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={visible}
                  onClick={() => columna.toggleVisibility()}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Check className={cn('size-4 shrink-0', !visible && 'opacity-0')} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {columna.columnDef.meta?.etiqueta ?? columna.id}
                  </span>
                  <span className="sr-only">{visible ? 'visible' : 'oculta'}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {ocultas > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={() => tabla.toggleAllColumnsVisible(true)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Mostrar todas
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
