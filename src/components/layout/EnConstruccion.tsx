import { Hammer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Placeholder honesto de las pantallas de la Fase 4: dice que va a mostrar cada una en
 * vez de dejar un lienzo en blanco. Se borra cuando la pantalla se implementa.
 */
export function EnConstruccion({ items }: { items: readonly string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hammer className="size-5 text-primary" aria-hidden />
          Pantalla en construcción — llega en la Fase 4
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          El shell, la autenticación y los datos ya están; falta la vista. Esto es lo que va a
          mostrar:
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
