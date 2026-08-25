/**
 * Caja de tooltip comun a todos los graficos (skill `charts-crm` §3).
 *
 * Todo tooltip de Kaudal es custom, nunca el default de Recharts, y toda linea lleva
 * su **etiqueta de tipo de valor** — nominal, real (pesos de tal mes) o USD MEP. Un
 * tooltip que muestra el numero crudo no cumple la rule `dinero.md`.
 */

import type { ReactNode } from 'react'

export type LineaTooltip = {
  nombre: string
  /** Ya formateado con `src/lib/formato.ts`: acá no se formatea nada. */
  valor: string
  /** `nominal`, `real (pesos de jul-2026)`, `USD MEP`. */
  tipoValor?: string
  color?: string
}

export function CajaTooltip({
  titulo,
  lineas,
  pie,
}: {
  titulo: string
  lineas: readonly LineaTooltip[]
  pie?: ReactNode
}) {
  return (
    <div className="min-w-56 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1.5 text-sm font-semibold">{titulo}</p>

      <ul className="space-y-1">
        {lineas.map((linea) => (
          <li key={linea.nombre} className="flex items-start gap-2 text-sm">
            {linea.color ? (
              <span
                aria-hidden
                className="mt-1.5 size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: linea.color }}
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block text-muted-foreground">{linea.nombre}</span>
              <span className="tabular block font-medium">
                {linea.valor}
                {linea.tipoValor ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {linea.tipoValor}
                  </span>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {pie ? <p className="mt-2 border-t pt-1.5 text-xs text-muted-foreground">{pie}</p> : null}
    </div>
  )
}
