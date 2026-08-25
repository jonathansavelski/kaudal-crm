/**
 * Los cuatro numeros de arriba de `/pipeline`. Presentacional puro: recibe el dataset ya
 * calculado por `armarPipeline` y solo formatea.
 *
 * Toda cifra lleva su etiqueta de tipo de valor (rule `dinero.md` §3): el pipeline se
 * valua en pesos nominales al ultimo MEP conocido, y eso se dice.
 */

import { CalendarClock, CalendarRange, Scale, Wallet } from 'lucide-react'

import { TarjetaKpi } from '@/components/dashboard/TarjetaKpi'
import type { DatosPipeline } from '@/lib/agregados/pipeline'
import { formatearCantidad, formatearFecha, formatearImporte } from '@/lib/formato'

export function ResumenPipeline({
  datos,
  fechaMep,
  cargando,
}: {
  datos?: DatosPipeline
  fechaMep?: string
  cargando: boolean
}) {
  const etiquetaNominal = 'nominal · ARS'
  const notaMep = fechaMep
    ? `Los montos en USD se valuaron al MEP venta del ${formatearFecha(fechaMep)}.`
    : undefined

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TarjetaKpi
        titulo="Pipeline abierto"
        icono={Wallet}
        cargando={cargando}
        principal={{ valor: formatearImporte(datos?.totalCentavos), tipoValor: etiquetaNominal }}
        nota={
          datos
            ? `${formatearCantidad(datos.cantidad)} oportunidades abiertas de ${formatearCantidad(datos.cantidadSinFiltrar)} en total`
            : undefined
        }
        formula="Suma de los montos de las oportunidades abiertas, normalizados a ARS."
      />

      <TarjetaKpi
        titulo="Pipeline ponderado"
        icono={Scale}
        cargando={cargando}
        principal={{
          valor: formatearImporte(datos?.totalPonderadoCentavos),
          tipoValor: etiquetaNominal,
        }}
        nota={notaMep}
        formula="Suma de monto × probabilidad de la etapa, sobre las oportunidades abiertas."
      />

      <TarjetaKpi
        titulo="Forecast a 3 meses"
        icono={CalendarClock}
        cargando={cargando}
        principal={{
          valor: formatearImporte(datos?.forecast3Centavos),
          tipoValor: etiquetaNominal,
        }}
        formula="Pipeline ponderado de lo que cierra dentro de los próximos 3 meses."
      />

      <TarjetaKpi
        titulo="Forecast a 6 meses"
        icono={CalendarRange}
        cargando={cargando}
        principal={{
          valor: formatearImporte(datos?.forecast6Centavos),
          tipoValor: etiquetaNominal,
        }}
        formula="Pipeline ponderado de lo que cierra dentro de los próximos 6 meses."
      />
    </div>
  )
}
