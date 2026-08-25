import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'
import type { CasaCambio } from '@/lib/api/dolar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCotizaciones } from '@/hooks/use-cotizaciones'
import { formatearFechaBreve, formatearMomento, formatearImporte } from '@/lib/formato'

/**
 * Cinta de cotizaciones de la topbar. Tres estados propios: cargando, error y con datos,
 * mas el aviso de que el dato viene del cache cuando el mercado no responde.
 *
 * Cada cifra dice que es: casa, "venta" y la moneda. Ninguna cotizacion ambigua
 * (rule `dinero.md` §3).
 */

const CASAS_VISIBLES: ReadonlyArray<{ casa: CasaCambio; etiqueta: string }> = [
  { casa: 'mep', etiqueta: 'MEP' },
  { casa: 'ccl', etiqueta: 'CCL' },
  { casa: 'oficial', etiqueta: 'Oficial' },
]

export function CintaCotizaciones() {
  const { data, isPending, isError, isFetching, refetch } = useCotizaciones()

  if (isPending) {
    return (
      <div className="flex items-center gap-4" aria-live="polite" aria-busy="true">
        {CASAS_VISIBLES.map(({ casa }) => (
          <Skeleton key={casa} className="h-8 w-28" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TriangleAlert className="size-4 text-negativo" aria-hidden />
        <span>No pudimos traer las cotizaciones ni desde el mercado ni desde el caché.</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <ul className="flex items-center gap-2">
        {CASAS_VISIBLES.map(({ casa, etiqueta }) => {
          const cotizacion = data.porCasa[casa]

          return (
            <li
              key={casa}
              className="rounded-md border bg-background px-2.5 py-1 leading-tight"
              title={`Dólar ${etiqueta}, cotización de venta en pesos`}
            >
              <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {etiqueta} venta
              </span>
              <span className="tabular block text-sm font-semibold">
                {formatearImporte(cotizacion?.ventaCentavos ?? null, 'ARS', 'sin dato')}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="hidden max-w-56 flex-col text-xs leading-tight text-muted-foreground md:flex">
        {data.origen === 'cache' ? (
          <span className="flex items-center gap-1.5">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            Cotización del {formatearFechaBreve(data.actualizado)}, sin conexión al mercado
          </span>
        ) : (
          <span>Mercado en vivo · dolarapi.com</span>
        )}
        <span>
          Actualizado {formatearMomento(data.actualizado, new Date())}
          {isFetching ? ' · actualizando…' : ''}
        </span>
      </div>
    </div>
  )
}
