/**
 * Skeleton con la **forma real** de la tabla: mismas columnas, mismo alto de fila
 * (rule `ui.md` §1). Nunca un spinner suelto, nunca un salto de layout cuando llegan
 * los datos.
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Anchos variados para que no parezca una grilla de bloques iguales. */
const ANCHOS = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20', 'w-28']

export function EsqueletoTabla({
  columnas,
  filas = 8,
}: {
  columnas: readonly { id: string; alineacion?: 'izquierda' | 'derecha' }[]
  filas?: number
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la tabla</span>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columnas.map((columna) => (
              <th key={columna.id} className="px-3 py-2.5">
                <Skeleton className={cn('h-4', columna.alineacion === 'derecha' ? 'ml-auto w-16' : 'w-20')} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: filas }, (_, indice) => (
            <tr key={indice} className="border-b">
              {columnas.map((columna, posicion) => (
                <td key={columna.id} className="px-3 py-3">
                  <Skeleton
                    className={cn(
                      'h-4',
                      ANCHOS[(indice + posicion) % ANCHOS.length] ?? 'w-24',
                      columna.alineacion === 'derecha' && 'ml-auto',
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
