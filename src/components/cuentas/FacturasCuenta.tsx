/**
 * Tabla de facturas de una cuenta dentro de su ficha.
 *
 * Reusa las mismas columnas que `/cobranzas` (menos la de cuenta, que aca es redundante)
 * y el mismo `TablaDatos` con sus cuatro estados. El orden y el paginado viven en la URL.
 */

import { estadoDePanel } from '@/components/charts/utilidades'
import { COLUMNAS_FACTURAS_CUENTA } from '@/components/cobranzas/columnas'
import { TablaDatos } from '@/components/tabla/TablaDatos'
import { useTablaKaudal } from '@/components/tabla/nucleo'
import type { FilaCobranza } from '@/lib/agregados/cobranzas'
import { formatearCantidad } from '@/lib/formato'

export function FacturasCuenta({
  facturas,
  cargando,
  error,
  onReintentar,
}: {
  facturas: readonly FilaCobranza[]
  cargando: boolean
  error: boolean
  onReintentar: () => void
}) {
  const tabla = useTablaKaudal({
    columnas: COLUMNAS_FACTURAS_CUENTA,
    datos: facturas,
    ordenPorDefecto: [{ id: 'fechaEmision', desc: true }],
    ocultasPorDefecto: ['moneda', 'saldoReal'],
  })

  return (
    <section className="min-w-0 space-y-2">
      <h2 className="text-base font-semibold">
        Facturas de la cuenta
        {facturas.length > 0 ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {formatearCantidad(facturas.length)} emitidas
          </span>
        ) : null}
      </h2>

      <TablaDatos
        tabla={tabla}
        estado={estadoDePanel({ cargando, error, vacio: facturas.length === 0 })}
        sustantivoPlural="facturas"
        mensajeVacio="Esta cuenta no tiene facturas emitidas. Es lo esperable en un prospecto: recién factura cuando firma un contrato o gana una implementación."
        onReintentar={onReintentar}
      />
    </section>
  )
}
