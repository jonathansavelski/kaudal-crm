/**
 * Campos de formulario compartidos: etiqueta + control, con el `htmlFor` siempre atado.
 *
 * `<select>` nativo a proposito: teclado, lector de pantalla y busqueda por letra vienen
 * de fabrica, y no agrega dependencia al bundle.
 */

import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'

export const CLASE_SELECT =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'

export function CampoFormulario({
  id,
  etiqueta,
  ayuda,
  children,
}: {
  id: string
  etiqueta: string
  ayuda?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  )
}

export type OpcionSelect = { valor: string; etiqueta: string }

export function SelectFormulario({
  id,
  etiqueta,
  valor,
  opciones,
  onCambio,
  vacio,
  ayuda,
}: {
  id: string
  etiqueta: string
  valor: string
  opciones: readonly OpcionSelect[]
  onCambio: (valor: string) => void
  /** Texto de la opcion "ninguno". Si no se pasa, el campo es obligatorio. */
  vacio?: string
  ayuda?: string
}) {
  return (
    <CampoFormulario id={id} etiqueta={etiqueta} ayuda={ayuda}>
      <select
        id={id}
        className={CLASE_SELECT}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
      >
        {vacio ? <option value="">{vacio}</option> : null}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </CampoFormulario>
  )
}
