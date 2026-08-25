import { Outlet } from 'react-router-dom'
import { BarraLateral } from '@/components/layout/BarraLateral'
import { BarraSuperior } from '@/components/layout/BarraSuperior'
import { PieGlobal } from '@/components/layout/PieGlobal'

/**
 * Shell de la app: sidebar fijo, topbar pegajosa, contenido y footer global.
 *
 * El contenido va en un contenedor con `min-w-0` para que una tabla ancha scrollee
 * adentro suyo y no empuje la pagina (rule `ui.md` §7).
 */
export function LayoutPrincipal() {
  return (
    <div className="flex min-h-svh bg-background">
      <BarraLateral />

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior />

        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        <PieGlobal />
      </div>
    </div>
  )
}
