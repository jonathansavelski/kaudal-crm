/**
 * Riesgo pais y tasas de plazo fijo, de api.argentinadatos.com.
 *
 * Cada indicador es su propia query: si se cae uno, el otro se sigue viendo. Los dos
 * tienen sus tres estados, con reintentar en el de error.
 */

import { Landmark, Percent, RefreshCw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRiesgoPais, useTasasPlazoFijo } from '@/hooks/use-macro'
import { calcularTea } from '@/lib/metricas/cobranzas'
import { formatearFecha, formatearIndice, formatearPorcentaje } from '@/lib/formato'

const TASAS_VISIBLES = 6

function CarteleraError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="flex items-center gap-2 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-negativo" aria-hidden />
        No pudimos traer este indicador de argentinadatos.com.
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        <RefreshCw className="size-4" aria-hidden />
        Reintentar
      </Button>
    </div>
  )
}

export function PanelRiesgoPais() {
  const { data, isPending, isError, refetch } = useRiesgoPais()

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Landmark className="size-5 text-muted-foreground" aria-hidden />
          Riesgo país
        </h2>
      </CardHeader>
      <CardContent className="px-5">
        {isPending ? <Skeleton className="h-12 w-40" /> : null}
        {isError ? <CarteleraError onReintentar={() => void refetch()} /> : null}
        {data ? (
          <>
            <p className="tabular text-3xl leading-tight font-semibold">
              {formatearIndice(data.puntosBasicos)}
            </p>
            <p className="text-sm text-muted-foreground">
              puntos básicos · EMBI+ Argentina al {formatearFecha(data.fecha)}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PanelTasas() {
  const { data, isPending, isError, refetch } = useTasasPlazoFijo()
  const visibles = data?.slice(0, TASAS_VISIBLES) ?? []

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Percent className="size-5 text-muted-foreground" aria-hidden />
          Plazo fijo a 30 días
        </h2>
        <p className="text-sm text-muted-foreground">
          TNA para clientes, y su TEA con capitalización mensual. Es la tasa con la que se
          descuenta la cartera.
        </p>
      </CardHeader>
      <CardContent className="px-5">
        {isPending ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((indice) => (
              <Skeleton key={indice} className="h-6 w-full" />
            ))}
          </div>
        ) : null}

        {isError ? <CarteleraError onReintentar={() => void refetch()} /> : null}

        {data && visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            El API respondió pero no trajo ninguna entidad con tasa para clientes.
          </p>
        ) : null}

        {visibles.length > 0 ? (
          <ul className="divide-y text-sm">
            <li className="flex gap-3 pb-1.5 text-xs font-medium text-muted-foreground">
              <span className="flex-1">Entidad</span>
              <span className="w-16 text-right">TNA</span>
              <span className="w-16 text-right">TEA</span>
            </li>
            {visibles.map((tasa) => (
              <li key={tasa.entidad} className="flex items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1 truncate">{tasa.entidad}</span>
                <span className="tabular w-16 text-right">{formatearPorcentaje(tasa.tna)}</span>
                <span className="tabular w-16 text-right font-medium">
                  {formatearPorcentaje(calcularTea(tasa.tna))}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
