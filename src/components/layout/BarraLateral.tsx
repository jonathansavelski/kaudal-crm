import { NavLink } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { NAVEGACION } from '@/lib/navegacion'
import { cn } from '@/lib/utils'

/**
 * Navegacion principal. En notebook (>= 1024 px) se ve con etiquetas; en tablet colapsa
 * a una columna de iconos, donde cada link conserva su `aria-label` y su `title`
 * (rule `ui.md` §4 y §7).
 */
export function BarraLateral() {
  return (
    <aside className="sticky top-0 z-20 flex h-svh w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-60">
      <div className="flex h-14 items-center gap-2.5 px-3 lg:px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Waves className="size-5" aria-hidden />
        </span>
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate text-sm font-semibold tracking-tight">Kaudal CRM</span>
          <span className="truncate text-xs text-sidebar-foreground/70">Nodus · comercial</span>
        </span>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-2 py-3 lg:px-3">
        {NAVEGACION.map(({ ruta, titulo, icono: Icono }) => (
          <NavLink
            key={ruta}
            to={ruta}
            end={ruta === '/'}
            title={titulo}
            aria-label={titulo}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icono className="size-5 shrink-0" aria-hidden />
                <span className="hidden truncate lg:inline">{titulo}</span>
                {/* El estado activo no depende solo del color: tambien hay una marca a la derecha. */}
                {isActive ? (
                  <span
                    aria-hidden
                    className="ml-auto hidden h-4 w-1 rounded-full bg-sidebar-primary lg:block"
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <p className="hidden px-4 pb-4 text-xs leading-relaxed text-sidebar-foreground/60 lg:block">
        Toda cifra se muestra nominal, real por IPC y en USD MEP.
      </p>
    </aside>
  )
}
