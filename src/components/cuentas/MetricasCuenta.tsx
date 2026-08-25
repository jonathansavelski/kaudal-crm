/**
 * Los cinco numeros propios del cliente en `/cuentas/:id`.
 *
 * Presentacional puro: todo llega calculado por `armarFicha`. Cada cifra dice si es
 * nominal, real (con su mes base) o USD MEP (rule `dinero.md` §3).
 */

import { AlertTriangle, Banknote, CalendarClock, ShieldCheck, TrendingUp } from 'lucide-react'

import { TarjetaKpi } from '@/components/dashboard/TarjetaKpi'
import { etiquetaDeScore } from '@/lib/agregados/clientes'
import type { FichaCuenta } from '@/lib/agregados/ficha'
import {
  formatearCantidad,
  formatearDias,
  formatearImporte,
  formatearIndice,
  formatearPorcentaje,
} from '@/lib/formato'

export function MetricasCuenta({
  ficha,
  mesBase,
  cargando,
}: {
  ficha?: FichaCuenta
  mesBase: string
  cargando: boolean
}) {
  const metricas = ficha?.metricas

  return (
    // Cinco columnas dejaban 137 px utiles por tarjeta en un notebook de 1280 px, y
    // la facturacion anual de un cliente grande mide casi 190 px. Tres columnas (3 + 2)
    // dan 267 px y la cifra entra entera en todo el rango 1280-1440.
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <TarjetaKpi
        titulo="Facturación 12 meses"
        icono={Banknote}
        cargando={cargando}
        principal={{
          valor: formatearImporte(metricas?.facturacion12mCentavos),
          tipoValor: 'nominal · ARS',
        }}
        secundaria={{
          valor: formatearImporte(metricas?.facturacion12mRealCentavos),
          tipoValor: mesBase ? `real (pesos de ${mesBase})` : 'real',
        }}
        nota={
          metricas ? `${formatearCantidad(metricas.cantidadFacturas)} facturas emitidas` : undefined
        }
        formula="Suma de las facturas emitidas en los últimos 365 días, normalizadas a ARS."
      />

      <TarjetaKpi
        titulo="Saldo pendiente"
        icono={AlertTriangle}
        cargando={cargando}
        principal={{
          valor: formatearImporte(metricas?.saldoCentavos),
          tipoValor: 'nominal · ARS',
        }}
        secundaria={{
          valor: formatearImporte(ficha?.saldoUsdCentavos, 'USD'),
          tipoValor: 'USD MEP',
        }}
        formula="Monto de cada factura menos sus cobros aplicados, según v_saldo_facturas."
      />

      <TarjetaKpi
        titulo="Mora promedio"
        icono={CalendarClock}
        cargando={cargando}
        principal={{ valor: formatearDias(metricas?.moraPromedioDias) }}
        nota={
          metricas
            ? `${formatearPorcentaje(metricas.pctFueraDeTermino)} de las facturas se pagaron o siguen fuera de término`
            : undefined
        }
        formula="Promedio de días de atraso: al cobro si ya se cobró, vigentes si sigue abierta."
      />

      <TarjetaKpi
        titulo="Score de riesgo"
        icono={ShieldCheck}
        cargando={cargando}
        principal={{
          valor: formatearIndice(metricas?.score),
          tipoValor: metricas ? etiquetaDeScore(metricas.score) : undefined,
        }}
        nota="100 es el mejor cliente posible."
        formula="40% mora, 30% facturas fuera de término, 15% antigüedad y 15% concentración."
      />

      <TarjetaKpi
        titulo="LTV estimado"
        icono={TrendingUp}
        cargando={cargando}
        principal={{
          valor: formatearImporte(
            ficha?.ltvCentavos,
            'ARS',
            ficha?.contratoVigente
              ? 'sin churn medible'
              : 'la cuenta no tiene contrato activo',
          ),
          tipoValor: ficha?.ltvCentavos === null ? undefined : 'nominal · ARS',
        }}
        formula="(Abono mensual × margen bruto 75%) / churn mensual de la cartera."
      />
    </div>
  )
}
