/**
 * Tarjeta de una oportunidad dentro de su columna de etapa. Es un boton: la tarjeta
 * entera abre el panel de detalle y se nota que se puede clickear (rule `ui.md` §2).
 */

import { CalendarDays } from 'lucide-react'

import type { OportunidadVista } from '@/lib/agregados/pipeline'
import { ETIQUETA_CANAL, ETIQUETA_TIPO_OPORTUNIDAD } from '@/lib/etiquetas'
import { formatearFecha, formatearImporte } from '@/lib/formato'

export function TarjetaOportunidad({
  oportunidad,
  onAbrir,
}: {
  oportunidad: OportunidadVista
  onAbrir: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ver el detalle de ${oportunidad.titulo}, de ${oportunidad.razonSocial}`}
      className="w-full rounded-md border bg-background p-2.5 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <p className="truncate text-sm font-medium">{oportunidad.titulo}</p>
      <p className="truncate text-xs text-muted-foreground">{oportunidad.razonSocial}</p>

      <p className="tabular mt-2 text-sm font-semibold">
        {formatearImporte(oportunidad.montoArsCentavos)}
      </p>
      <p className="text-xs text-muted-foreground">
        nominal · ARS
        {oportunidad.moneda === 'USD'
          ? ` (facturada en ${formatearImporte(oportunidad.montoOriginalCentavos, 'USD')})`
          : ''}
      </p>

      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        <span className="tabular">Cierre {formatearFecha(oportunidad.fechaCierreEstimada)}</span>
      </p>

      <p className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-1.5 py-0.5">
          {ETIQUETA_TIPO_OPORTUNIDAD[oportunidad.tipo]}
        </span>
        <span className="rounded-full bg-secondary px-1.5 py-0.5">
          {ETIQUETA_CANAL[oportunidad.origen]}
        </span>
      </p>
    </button>
  )
}
