/**
 * Controles de entrada de los filtros: selector, campo y buscador.
 *
 * Los chips de filtros activos, el contador de filtrados y la barra que los ordena viven
 * en `BarraFiltros.tsx`, para que ningun archivo de componentes pase de 200 lineas.
 */

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type OpcionFiltro = { valor: string; etiqueta: string }

/** `<select>` nativo estilado: accesible, con teclado, sin dependencia extra. */
export function SelectorFiltro({
  id,
  etiqueta,
  valor,
  opciones,
  onCambio,
  textoTodos = 'Todos',
}: {
  id: string
  etiqueta: string
  valor: string
  opciones: readonly OpcionFiltro[]
  onCambio: (valor: string) => void
  textoTodos?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        className={cn(
          'h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm shadow-xs',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      >
        <option value="">{textoTodos}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CampoFiltro({
  id,
  etiqueta,
  valor,
  onCambio,
  tipo = 'text',
  placeholder,
}: {
  id: string
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  tipo?: 'text' | 'number' | 'date'
  placeholder?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      <Input
        id={id}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(evento) => onCambio(evento.target.value)}
        className="h-9"
      />
    </div>
  )
}

export function CampoBusqueda({
  id,
  valor,
  onCambio,
  placeholder,
}: {
  id: string
  valor: string
  onCambio: (valor: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pl-8"
      />
    </div>
  )
}
