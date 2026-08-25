/**
 * Chips de filtros activos, contador de filtrados y barra superior de la tabla.
 *
 * Los filtros activos se ven como **chips removibles**, nunca escondidos en un panel
 * colapsado (rule `ui.md` §6), y el contador de filtrados sobre el total esta siempre a
 * la vista, con el total sin filtrar (rule `ui.md` §2).
 */

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatearCantidad } from '@/lib/formato'

export type ChipFiltro = { clave: string; texto: string }

export function ChipsFiltros({
  chips,
  onQuitar,
  onLimpiar,
}: {
  chips: readonly ChipFiltro[]
  onQuitar: (clave: string) => void
  onLimpiar: () => void
}) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.clave}
          className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium"
        >
          {chip.texto}
          <button
            type="button"
            onClick={() => onQuitar(chip.clave)}
            className="rounded-full p-0.5 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Quitar filtro ${chip.texto}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}

      <Button variant="ghost" size="xs" onClick={onLimpiar}>
        Limpiar filtros
      </Button>
    </div>
  )
}

/**
 * `37 de 120 cuentas cumplen los filtros`. El total sin filtrar tambien se ve
 * (rule `ui.md` §2).
 */
export function ContadorFiltrados({
  filtradas,
  total,
  singular,
  plural,
  hayFiltros,
  cargando = false,
  error = false,
}: {
  filtradas: number
  total: number
  singular: string
  plural: string
  hayFiltros: boolean
  /** Mientras carga no hay total: decir "0" seria informar un dato falso. */
  cargando?: boolean
  /** Si la consulta fallo tampoco hay total. El cartel de error va abajo, en la tabla. */
  error?: boolean
}) {
  const sustantivo = filtradas === 1 ? singular : plural

  if (error) return null

  if (cargando) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Contando {plural}...
      </p>
    )
  }

  return (
    <p className="tabular text-sm text-muted-foreground" aria-live="polite">
      {hayFiltros ? (
        <>
          <span className="font-semibold text-foreground">{formatearCantidad(filtradas)}</span> de{' '}
          {formatearCantidad(total)} {sustantivo} cumplen los filtros
        </>
      ) : (
        <>
          <span className="font-semibold text-foreground">{formatearCantidad(total)}</span>{' '}
          {plural} en total, sin filtros aplicados
        </>
      )}
    </p>
  )
}

/** Fila superior de la tabla: buscador y filtros a la izquierda, acciones a la derecha. */
export function BarraTabla({
  filtros,
  acciones,
  contador,
  chips,
}: {
  filtros: ReactNode
  acciones: ReactNode
  contador: ReactNode
  chips: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{filtros}</div>
        <div className="flex shrink-0 items-center gap-2">{acciones}</div>
      </div>
      {chips}
      {contador}
    </div>
  )
}
