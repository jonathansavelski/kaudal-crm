import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CintaCotizaciones } from '@/components/layout/CintaCotizaciones'
import { useSesion } from '@/hooks/use-sesion'
import { NAVEGACION } from '@/lib/navegacion'

/**
 * Topbar: donde esta parado el usuario, las cotizaciones en vivo y el logout.
 * El fetching de las cotizaciones lo hace `CintaCotizaciones`, no este componente.
 */
export function BarraSuperior() {
  const { pathname } = useLocation()
  const { sesion, cerrarSesion } = useSesion()
  const [saliendo, setSaliendo] = useState(false)

  const seccion =
    NAVEGACION.find((item) => item.ruta !== '/' && pathname.startsWith(item.ruta))?.titulo ??
    (pathname === '/' ? 'Dashboard' : 'Kaudal CRM')

  async function salir() {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card/95 px-4 backdrop-blur lg:px-6">
      <p className="hidden shrink-0 text-sm font-medium tracking-tight md:block">{seccion}</p>

      <div className="ml-auto flex min-w-0 items-center gap-4">
        <CintaCotizaciones />

        <div className="flex shrink-0 items-center gap-2 border-l pl-4">
          <span className="hidden max-w-40 truncate text-xs text-muted-foreground xl:block">
            {sesion?.user.email ?? 'sesión activa'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void salir()}
            disabled={saliendo}
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden lg:inline">{saliendo ? 'Saliendo…' : 'Salir'}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
