/**
 * Cotizaciones del dia: MEP, CCL, oficial, blue y tarjeta.
 *
 * Tres estados propios (cargando, error con reintentar, con datos) y el aviso de que el
 * dato sale del cache cuando dolarapi no responde. Cada cifra dice que es: casa, compra
 * o venta, y en pesos.
 */

import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCotizaciones } from '@/hooks/use-cotizaciones'
import type { CasaCambio } from '@/lib/api/dolar'
import { formatearFechaBreve, formatearImporte, formatearMomento } from '@/lib/formato'

const CASAS: ReadonlyArray<{ casa: CasaCambio; etiqueta: string }> = [
  { casa: 'mep', etiqueta: 'Dólar MEP' },
  { casa: 'ccl', etiqueta: 'Contado con liqui' },
  { casa: 'oficial', etiqueta: 'Oficial' },
  { casa: 'blue', etiqueta: 'Blue' },
  { casa: 'tarjeta', etiqueta: 'Tarjeta' },
]

export function PanelCotizaciones({ hoy }: { hoy: Date }) {
  const { data, isPending, isError, refetch } = useCotizaciones()

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Cotizaciones del día</h2>
          {data ? (
            <p className="text-xs text-muted-foreground">
              {data.origen === 'cache' ? (
                <span className="flex items-center gap-1.5">
                  <WifiOff className="size-4" aria-hidden />
                  Cotización del {formatearFechaBreve(data.actualizado)}, sin conexión al mercado
                </span>
              ) : (
                <>Mercado en vivo · dolarapi.com · {formatearMomento(data.actualizado, hoy)}</>
              )}
            </p>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-5">
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-busy="true">
            {CASAS.map((item) => (
              <Skeleton key={item.casa} className="h-24 w-full" />
            ))}
          </div>
        ) : null}

        {isError || (!isPending && !data) ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <TriangleAlert className="size-6 text-negativo" aria-hidden />
            <p className="text-sm font-medium">
              No pudimos traer las cotizaciones ni del mercado ni del caché.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : null}

        {data ? (
          <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {CASAS.map(({ casa, etiqueta }) => {
              const cotizacion = data.porCasa[casa]

              return (
                <li key={casa} className="rounded-md border px-3 py-2.5">
                  <p className="text-sm font-medium">{etiqueta}</p>
                  <p className="tabular mt-1 text-2xl leading-tight font-semibold">
                    {formatearImporte(cotizacion?.ventaCentavos ?? null, 'ARS', 'sin dato')}
                  </p>
                  <p className="text-xs text-muted-foreground">venta, en pesos</p>
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    compra {formatearImporte(cotizacion?.compraCentavos ?? null, 'ARS', 'sin dato')}
                  </p>
                </li>
              )
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
