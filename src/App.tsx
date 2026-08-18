import { Waves, CircleCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Placeholder de la Fase 0. La Fase 3 lo reemplaza por el shell real
 * (router, auth de Supabase, sidebar, topbar y footer global).
 */

const HARNESS: ReadonlyArray<{ titulo: string; items: readonly string[] }> = [
  { titulo: 'Rules', items: ['dinero.md', 'stack.md', 'supabase.md', 'ui.md'] },
  {
    titulo: 'Skills',
    items: ['metricas-financieras', 'seed-financiero', 'charts-crm'],
  },
  {
    titulo: 'Agentes',
    items: ['arquitecto-datos', 'analista-financiero', 'frontend-crm', 'qa-datos'],
  },
]

export default function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Waves className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kaudal CRM</h1>
          <p className="text-sm text-muted-foreground">
            CRM comercial de Nodus. Valor nominal, real y USD MEP.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleCheck className="size-4 text-positivo" aria-hidden />
            Fase 0 — scaffolding y harness
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          {HARNESS.map((grupo) => (
            <section key={grupo.titulo} className="space-y-2">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {grupo.titulo}
              </h2>
              <ul className="space-y-1.5">
                {grupo.items.map((item) => (
                  <li key={item}>
                    <Badge variant="secondary" className="font-mono text-xs font-normal">
                      {item}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Proximo paso: Fase 1 — esquema, migraciones y seed.
      </p>
    </main>
  )
}
