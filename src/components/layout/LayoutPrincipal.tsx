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

        {/*
          overflow-x-clip: la pagina nunca scrollea horizontal (rule ui.md §7). Las
          tablas anchas ya scrollean dentro de su propio contenedor; sin esta guarda
          el desborde se escapa igual al nivel del documento y termina empujando la
          pagina en tablet. Se usa clip y no hidden para no crear un contexto de
          scroll que rompa el `position: sticky` de los encabezados de tabla.
        */}
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        <PieGlobal />
      </div>
    </div>
  )
}
