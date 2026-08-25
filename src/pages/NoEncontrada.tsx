import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { NAVEGACION } from '@/lib/navegacion'

export default function NoEncontrada() {
  const { pathname } = useLocation()

  return (
    <>
      <EncabezadoPagina
        titulo="Página no encontrada"
        descripcion={`La ruta ${pathname} no existe en Kaudal. Puede ser un enlace viejo o un error de tipeo.`}
      />

      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Compass className="size-5 text-primary" aria-hidden />
            Estas son las pantallas disponibles
          </p>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {NAVEGACION.map(({ ruta, titulo, descripcion, icono: Icono }) => (
              <li key={ruta}>
                <Link
                  to={ruta}
                  className="flex h-full gap-3 rounded-md border p-3 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icono className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{titulo}</span>
                    <span className="block text-xs text-muted-foreground">{descripcion}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="size-4" aria-hidden />
              Volver al dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
