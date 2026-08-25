/**
 * VAN de la cartera y provision por incobrabilidad.
 *
 * La tasa arranca en la **mejor TNA de plazo fijo** que devuelve argentinadatos: es el
 * costo de oportunidad real de tener la plata inmovilizada en una factura. Se puede pisar
 * a mano, y el valor pisado viaja en la URL para que el link muestre el mismo escenario.
 *
 * Los tres estados de la tasa: cargando, en vivo, y sin conexion con su valor de
 * respaldo. Nunca un `NaN` ni un input vacio.
 */

import { Loader2, RotateCcw, TriangleAlert } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { DatosCobranzas } from '@/lib/agregados/cobranzas'
import { formatearImporte, formatearPorcentaje } from '@/lib/formato'

function Linea({
  etiqueta,
  valor,
  tipoValor,
  nota,
  destacado = false,
}: {
  etiqueta: string
  valor: string
  tipoValor?: string
  nota?: string
  destacado?: boolean
}) {
  return (
    <div className="border-t pt-3 first:border-t-0 first:pt-0">
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
      <p className={destacado ? 'tabular text-2xl font-semibold' : 'tabular text-lg font-medium'}>
        {valor}
      </p>
      {tipoValor ? <p className="text-xs text-muted-foreground">{tipoValor}</p> : null}
      {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  )
}

export function PanelVan({
  datos,
  tnaPct,
  tnaDelMercado,
  entidad,
  cargandoTasa,
  errorTasa,
  cargando,
  onTna,
  onReiniciarTna,
}: {
  datos?: DatosCobranzas
  /** TNA en uso, en puntos porcentuales: `31,5` = 31,5% anual. */
  tnaPct: number
  tnaDelMercado: number | null
  entidad: string | null
  cargandoTasa: boolean
  errorTasa: boolean
  cargando: boolean
  onTna: (valor: string) => void
  onReiniciarTna: () => void
}) {
  const pisada = tnaDelMercado !== null && Math.abs(tnaPct - tnaDelMercado) > 0.001

  return (
    <Card className="min-w-0 gap-4 py-5">
      <CardHeader className="px-5">
        <h2 className="text-base font-semibold">Valor presente de la cartera</h2>
        <p className="text-sm text-muted-foreground">
          Cada saldo se descuenta a su fecha de cobro esperada. La diferencia contra el nominal es
          lo que cuesta esperar.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="tna">Tasa nominal anual de descuento (%)</Label>
            <Input
              id="tna"
              type="number"
              min="0"
              max="500"
              step="0.5"
              value={String(tnaPct)}
              onChange={(evento) => onTna(evento.target.value)}
            />
          </div>

          {pisada ? (
            <Button variant="outline" size="sm" onClick={onReiniciarTna}>
              <RotateCcw className="size-4" aria-hidden />
              Volver a la del mercado
            </Button>
          ) : null}
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {cargandoTasa ? (
            <>
              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />
              Buscando la tasa de plazo fijo del mercado...
            </>
          ) : errorTasa ? (
            <>
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-negativo" aria-hidden />
              No pudimos traer las tasas del mercado. Se está usando un valor de respaldo, editable
              acá arriba.
            </>
          ) : (
            <>
              Mejor TNA de plazo fijo del mercado:{' '}
              <span className="tabular font-medium">
                {formatearPorcentaje((tnaDelMercado ?? 0) / 100)}
              </span>
              {entidad ? ` (${entidad})` : ''}. Equivale a una TEA de{' '}
              <span className="tabular font-medium">
                {formatearPorcentaje(datos?.teaAplicada)}
              </span>{' '}
              con capitalización mensual.
            </>
          )}
        </p>

        {cargando ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Calculando el valor presente</span>
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="h-6 w-56 animate-pulse rounded bg-muted" />
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-3">
            <Linea
              etiqueta="VAN de la cartera"
              valor={formatearImporte(datos?.vanCentavos)}
              tipoValor="nominal descontado · ARS"
              destacado
              nota="Las facturas incobrables no entran: su pérdida esperada la mide la provisión."
            />
            <Linea
              etiqueta="Costo de esperar"
              valor={formatearImporte(datos?.costoDeEsperaCentavos)}
              tipoValor="nominal · ARS"
              nota="VAN menos el saldo nominal: lo que la demora en cobrar le saca a la cartera."
            />
            <Linea
              etiqueta="Provisión por incobrabilidad (ECL)"
              valor={formatearImporte(datos?.eclCentavos)}
              tipoValor="nominal · ARS"
              nota={
                datos
                  ? `${formatearPorcentaje(datos.eclSobreSaldo)} del saldo pendiente. Cada bucket aporta su tasa de pérdida esperada.`
                  : undefined
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
