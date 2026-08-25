/**
 * Tarjeta de KPI del dashboard (rule `ui.md` §5).
 *
 * Cifra grande, etiqueta de moneda y de tipo de valor debajo, y un popover que explica
 * la formula en una linea. La cifra llega **ya formateada**: esta tarjeta no calcula ni
 * formatea nada.
 */

import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

export type LineaKpi = {
  valor: string
  /** `nominal`, `real (pesos de jul-2026)`, `USD MEP`. Nunca una cifra sin esto. */
  tipoValor?: string
}

export function TarjetaKpi({
  titulo,
  icono: Icono,
  principal,
  secundaria,
  nota,
  formula,
  cargando = false,
}: {
  titulo: string
  icono: LucideIcon
  principal: LineaKpi
  secundaria?: LineaKpi
  nota?: string
  /** La formula, en una linea. Va en el popover. */
  formula: string
  cargando?: boolean
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icono className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <h3 className="truncate text-sm font-medium text-muted-foreground">{titulo}</h3>
          </div>

          <Popover>
            <PopoverTrigger
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Cómo se calcula ${titulo}`}
            >
              <Info className="size-4" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <p className="text-sm font-semibold">{titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formula}</p>
            </PopoverContent>
          </Popover>
        </div>

        {cargando ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : (
          <>
            <p className="tabular text-3xl leading-tight font-semibold">{principal.valor}</p>
            {principal.tipoValor ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{principal.tipoValor}</p>
            ) : null}

            {secundaria ? (
              <p className="mt-2 border-t pt-2 text-sm">
                <span className="tabular font-medium">{secundaria.valor}</span>
                {secundaria.tipoValor ? (
                  <span className="ml-1.5 text-muted-foreground">{secundaria.tipoValor}</span>
                ) : null}
              </p>
            ) : null}

            {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
