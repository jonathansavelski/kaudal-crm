import type { ReactNode } from 'react'

/**
 * Encabezado comun a todas las pantallas. El `h1` sale de la misma constante que el
 * item del sidebar, asi no pueden divergir (rule `ui.md` §6).
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{descripcion}</p>
        ) : null}
      </div>
      {acciones ? <div className="flex shrink-0 items-center gap-2">{acciones}</div> : null}
    </div>
  )
}
