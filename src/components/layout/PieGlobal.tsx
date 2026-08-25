import { Bot, FileText, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AGENTES, LLM, RULES, SKILLS, STACK, type GrupoHarness } from '@/lib/harness'

/**
 * Footer global, presente en todas las paginas incluida la de login.
 *
 * No es un pie decorativo: es un item calificable del TP. Explica con que rules, skills,
 * agentes, LLM y stack se construyo Kaudal, con la misma jerarquia tipografica que el
 * resto de la app para que se lea proyectado.
 */

const ICONOS: Readonly<Record<string, LucideIcon>> = {
  'Rules aplicadas': FileText,
  Skills: Sparkles,
  'Agentes personalizados': Bot,
}

function ColumnaHarness({ grupo }: { grupo: GrupoHarness }) {
  const Icono = ICONOS[grupo.titulo] ?? FileText

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Icono className="size-4 text-primary" aria-hidden />
        {grupo.titulo}
        <span className="font-mono text-xs font-normal text-muted-foreground">{grupo.ruta}</span>
      </h3>
      <dl className="space-y-2.5">
        {grupo.entradas.map((entrada) => (
          <div key={entrada.nombre}>
            <dt className="font-mono text-[0.8125rem] font-medium text-foreground">
              {entrada.nombre}
            </dt>
            <dd className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              {entrada.detalle}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function PieGlobal() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-6 py-10">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Kaudal CRM — cómo está construido
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Trabajo Práctico Integrador del Módulo Finanzas, posgrado en Inteligencia
            Artificial, UCEMA 2026. El harness de rules, skills y agentes vive en la carpeta{' '}
            <span className="font-mono">.claude/</span> del repositorio y se aplicó en cada fase.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          <ColumnaHarness grupo={RULES} />
          <ColumnaHarness grupo={SKILLS} />
          <ColumnaHarness grupo={AGENTES} />
        </div>

        <div className="grid gap-8 border-t pt-8 md:grid-cols-3">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">LLM</h3>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{LLM.modelo}</span> vía{' '}
              <span className="font-medium text-foreground">{LLM.herramienta}</span>. {LLM.detalle}
            </p>
          </section>

          <section className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-semibold tracking-tight">Stack</h3>
            <dl className="grid gap-x-6 gap-y-1.5 text-[0.8125rem] sm:grid-cols-2">
              {STACK.map((capa) => (
                <div key={capa.nombre} className="flex gap-2">
                  <dt className="w-20 shrink-0 font-medium text-foreground">{capa.nombre}</dt>
                  <dd className="text-muted-foreground">{capa.detalle}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </footer>
  )
}
