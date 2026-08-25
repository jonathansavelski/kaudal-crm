/**
 * Timeline cronologico de las acciones comerciales de una cuenta, de lo mas reciente a
 * lo mas viejo.
 *
 * Sus tres estados: cargando con skeleton de la misma forma, vacio con su explicacion y
 * su accion, y con datos (rule `ui.md` §1).
 */

import type { ReactNode } from 'react'
import { CalendarPlus, MessageSquareOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EventoTimeline } from '@/lib/agregados/ficha'
import {
  COLOR_RESULTADO_ACCION,
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
} from '@/lib/etiquetas'
import { formatearCantidad, formatearFecha, formatearImporte } from '@/lib/formato'

/** Cuantos eventos se muestran antes de pedir "ver todo": un timeline de 40 no se lee. */
const VISIBLES = 12

function Marco({ children, acciones }: { children: ReactNode; acciones?: ReactNode }) {
  return (
    <Card className="min-w-0 gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Timeline comercial</h2>
          {acciones}
        </div>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  )
}

export function TimelineAcciones({
  eventos,
  cargando,
  mostrarTodo,
  onMostrarTodo,
  onNuevaAccion,
}: {
  eventos: readonly EventoTimeline[]
  cargando: boolean
  mostrarTodo: boolean
  onMostrarTodo: () => void
  onNuevaAccion: () => void
}) {
  const botonAlta = (
    <Button size="sm" variant="outline" onClick={onNuevaAccion}>
      <CalendarPlus className="size-4" aria-hidden />
      Cargar acción
    </Button>
  )

  if (cargando) {
    return (
      <Marco>
        <div className="space-y-4" aria-busy="true">
          <span className="sr-only">Cargando el timeline</span>
          {[0, 1, 2, 3, 4].map((indice) => (
            <div key={indice} className="flex gap-3">
              <Skeleton className="size-3 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </Marco>
    )
  }

  if (eventos.length === 0) {
    return (
      <Marco acciones={botonAlta}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquareOff className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Sin acciones comerciales registradas.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Nadie tocó esta cuenta todavía, o los toques se hicieron por fuera del CRM. Cargá la
            primera para que empiece a computar en el CAC de su canal.
          </p>
          {botonAlta}
        </div>
      </Marco>
    )
  }

  const visibles = mostrarTodo ? eventos : eventos.slice(0, VISIBLES)

  return (
    <Marco acciones={botonAlta}>
      <ol className="relative space-y-4 border-l pl-5">
        {visibles.map((evento) => (
          <li key={evento.id} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-2 ring-card"
              style={{ backgroundColor: COLOR_RESULTADO_ACCION[evento.resultado] }}
            />

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {ETIQUETA_TIPO_ACCION[evento.tipo]}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {ETIQUETA_RESULTADO_ACCION[evento.resultado]}
                </span>
              </p>
              <p className="tabular text-xs text-muted-foreground">
                {formatearFecha(evento.fecha)}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {evento.campania ? `Campaña: ${evento.campania}` : 'Sin campaña'}
              {evento.oportunidad ? ` · ${evento.oportunidad}` : ''}
              {evento.costoArsCentavos > 0
                ? ` · ${formatearImporte(evento.costoArsCentavos)} de costo nominal`
                : ' · sin costo'}
            </p>

            {evento.notas ? <p className="mt-1 text-sm">{evento.notas}</p> : null}
          </li>
        ))}
      </ol>

      {!mostrarTodo && eventos.length > VISIBLES ? (
        <Button variant="ghost" size="sm" className="mt-3" onClick={onMostrarTodo}>
          Ver las {formatearCantidad(eventos.length)} acciones
        </Button>
      ) : null}
    </Marco>
  )
}
