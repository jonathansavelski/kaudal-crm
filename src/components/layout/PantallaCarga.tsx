import { LoaderCircle } from 'lucide-react'

/**
 * Estado de carga a pantalla completa. Se usa mientras se resuelve la sesion inicial:
 * sin esto, el usuario ya logueado ve un flash del login antes del dashboard.
 */
export function PantallaCarga({ mensaje = 'Cargando Kaudal…' }: { mensaje?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">{mensaje}</p>
    </div>
  )
}
