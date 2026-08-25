/**
 * Encabezado de columna ordenable, con **indicador visible** de cual ordena y en que
 * sentido (rule `ui.md` §2).
 *
 * El icono no es el unico portador de la informacion: el `title` lo dice en texto y el
 * `<th>` lleva `aria-sort`.
 */

import type { Column, RowData } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import type { AlineacionColumna, Caracteristicas } from '@/components/tabla/nucleo'
import { cn } from '@/lib/utils'

export function CabeceraOrdenable<TData extends RowData>({
  columna,
  titulo,
  alineacion = 'izquierda',
}: {
  columna: Column<Caracteristicas, TData>
  titulo: string
  alineacion?: AlineacionColumna
}) {
  const sentido = columna.getIsSorted()

  if (!columna.getCanSort()) {
    return <span className={cn(alineacion === 'derecha' && 'block text-right')}>{titulo}</span>
  }

  const Icono = sentido === 'asc' ? ArrowUp : sentido === 'desc' ? ArrowDown : ChevronsUpDown
  const explicacion =
    sentido === 'asc'
      ? `${titulo}: orden ascendente`
      : sentido === 'desc'
        ? `${titulo}: orden descendente`
        : `Ordenar por ${titulo}`

  return (
    <button
      type="button"
      onClick={columna.getToggleSortingHandler()}
      title={explicacion}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-sm py-0.5 font-medium transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        alineacion === 'derecha' && 'justify-end',
        sentido ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span className="truncate">{titulo}</span>
      <Icono className={cn('size-3.5 shrink-0', !sentido && 'opacity-50')} aria-hidden />
      <span className="sr-only">{explicacion}</span>
    </button>
  )
}
