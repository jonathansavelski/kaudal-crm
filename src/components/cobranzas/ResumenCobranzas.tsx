/**
 * Los cuatro numeros de arriba de `/cobranzas`. Presentacional: recibe el dataset ya
 * calculado por `armarCobranzas`.
 */

import { CalendarClock, Coins, ShieldAlert, Wallet } from 'lucide-react'

import { TarjetaKpi } from '@/components/dashboard/TarjetaKpi'
import type { DatosCobranzas } from '@/lib/agregados/cobranzas'
import { formatearDias, formatearImporte, formatearPorcentaje } from '@/lib/formato'

export function ResumenCobranzas({
  datos,
  mesBase,
  cargando,
}: {
  datos?: DatosCobranzas
  mesBase: string
  cargando: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TarjetaKpi
        titulo="Saldo pendiente"
        icono={Wallet}
        cargando={cargando}
        principal={{
          valor: formatearImporte(datos?.saldoNominalCentavos),
          tipoValor: 'nominal · ARS',
        }}
        secundaria={{
          // Igual que en el KPI del dashboard: esta cifra es mayor que el nominal, asi
          // que llamarla "real" a secas se lee al reves de la nota. No es el valor real
          // de la cartera, es cuanto valia esa plata cuando se facturo.
          valor: formatearImporte(datos?.saldoRealCentavos),
          tipoValor: mesBase ? `valor a la emisión, en pesos de ${mesBase}` : 'valor a la emisión',
        }}
        nota="La cartera se va a cobrar por su valor nominal, pero al facturarla esa plata valía más. La brecha es lo que la inflación licuó mientras la factura esperaba."
        formula="Monto de cada factura menos sus cobros aplicados, normalizado a ARS. La cifra de abajo reexpresa cada saldo a pesos del mes base con el IPC de su mes de emisión."
      />

      <TarjetaKpi
        titulo="Saldo en dólares"
        icono={Coins}
        cargando={cargando}
        principal={{
          valor: formatearImporte(datos?.saldoUsdCentavos, 'USD'),
          tipoValor: 'USD MEP',
        }}
        formula="Saldo pendiente en ARS llevado a dólar MEP a la última cotización conocida."
      />

      <TarjetaKpi
        titulo="DSO"
        icono={CalendarClock}
        cargando={cargando}
        principal={{ valor: formatearDias(datos?.dsoDias) }}
        secundaria={{
          valor: formatearImporte(datos?.saldoPromedioCentavos),
          tipoValor: 'saldo promedio nominal',
        }}
        nota="Sobre los cierres de los últimos 12 meses más el corte de hoy."
        formula="(Saldo promedio de cuentas por cobrar / ventas a crédito) × 365 días."
      />

      <TarjetaKpi
        titulo="Provisión por incobrables"
        icono={ShieldAlert}
        cargando={cargando}
        principal={{ valor: formatearImporte(datos?.eclCentavos), tipoValor: 'nominal · ARS' }}
        nota={
          datos ? `${formatearPorcentaje(datos.eclSobreSaldo)} del saldo pendiente` : undefined
        }
        formula="Suma de saldo × probabilidad de default del bucket de aging de cada factura."
      />
    </div>
  )
}
