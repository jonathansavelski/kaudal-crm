/**
 * Panel lateral deslizante. Lo usa el detalle de oportunidad de `/pipeline` y los
 * formularios de alta de `/cuentas/:id` y `/acciones`.
 *
 * Cierra con **Escape** y con **click afuera** (rule `ui.md` §6): las dos cosas las
 * resuelve el primitivo `Dialog` de Radix, que ademas atrapa el foco y devuelve el foco
 * al disparador al cerrar.
 *
 * No se edita `src/components/ui/`: esto es un componente propio que envuelve el
 * primitivo, como pide la rule `stack.md` §5.
 */

import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export function PanelLateral({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  ancho = 'md',
  pie,
  children,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  ancho?: 'md' | 'lg'
  pie?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(siguiente) => !siguiente && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-card shadow-lg outline-none',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            ancho === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base leading-tight font-semibold">{titulo}</Dialog.Title>
              {descripcion ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {descripcion}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  Panel de detalle. Se cierra con la tecla Escape o haciendo click afuera.
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Cerrar el panel"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {pie ? <div className="border-t px-5 py-3">{pie}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
