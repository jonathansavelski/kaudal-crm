/**
 * Los seis KPI del dashboard. Este componente no calcula: recibe `kpis` ya armado por
 * `armarDashboard` y solo elige que texto acompana a cada cifra.
 *
 * Toda cifra de plata lleva su etiqueta de tipo de valor (rule `dinero.md` §3).
 */

import { Banknote, Gauge, Layers, PieChart, ShieldAlert, Wallet } from 'lucide-react'

import { TarjetaKpi } from '@/components/dashboard/TarjetaKpi'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import type { KpisDashboard } from '@/lib/agregados/dashboard'
import { ETIQUETA_LECTURA_HHI } from '@/lib/etiquetas'
import { etiquetaTipoValor, formatearCantidad, formatearDias, formatearImporte, formatearIndice, formatearMesAnioGuion, formatearPorcentaje } from '@/lib/formato'

export function FilaKpis({
  kpis,
  contexto,
  cargando,
}: {
  kpis?: KpisDashboard
  contexto?: ContextoMacro
  cargando: boolean
}) {
  const mesBase = contexto?.mesBase
  const etiquetaNominal = `${etiquetaTipoValor('nominal')} · ARS`
  // 'pesos de jul-2026', sin la palabra "real" adelante: la cartera muestra el valor
  // a la emision, que es mayor que el nominal, y "real" a secas se leeria al reves.
  const etiquetaMesBase = mesBase ? `pesos de ${formatearMesAnioGuion(mesBase)}` : 'pesos del mes base'

  return (
    <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <TarjetaKpi
        titulo="MRR"
        icono={Banknote}
        cargando={cargando}
        principal={{ valor: formatearImporte(kpis?.mrrCentavos), tipoValor: etiquetaNominal }}
        secundaria={{
          valor: formatearImporte(kpis?.mrrUsdCentavos, 'USD'),
          tipoValor: etiquetaTipoValor('usd_mep', null, contexto?.fechaMepUltimo),
        }}
        nota={
          kpis ? `${formatearCantidad(kpis.clientesActivos)} clientes con contrato activo` : undefined
        }
        formula="Suma del abono mensual de los contratos activos, con los contratos en USD llevados a pesos al MEP venta."
      />

      <TarjetaKpi
        titulo="Pipeline ponderado"
        icono={Layers}
        cargando={cargando}
        principal={{
          valor: formatearImporte(kpis?.pipelinePonderadoCentavos),
          tipoValor: etiquetaNominal,
        }}
        nota={
          kpis
            ? `${formatearCantidad(kpis.oportunidadesAbiertas)} oportunidades abiertas`
            : undefined
        }
        formula="Suma de cada oportunidad abierta multiplicada por la probabilidad de cierre de su etapa (demo 30%, propuesta 50%, negociación 75%)."
      />

      <TarjetaKpi
        titulo="DSO"
        icono={Gauge}
        cargando={cargando}
        principal={{
          valor: formatearDias(kpis?.dsoDias, 'sin ventas en el período'),
          tipoValor: 'días promedio de cobro · últimos 365 días',
        }}
        secundaria={{
          valor: formatearImporte(kpis?.saldoPromedioCentavos),
          tipoValor: `${etiquetaTipoValor('nominal')} · saldo promedio de cuentas por cobrar`,
        }}
        formula="Saldo promedio de cuentas por cobrar dividido las ventas a crédito del período, por 365 días. El promedio sale de los cierres de los últimos 12 meses más el de hoy."
      />

      <TarjetaKpi
        titulo="Saldo de cartera"
        icono={Wallet}
        cargando={cargando}
        principal={{
          valor: formatearImporte(kpis?.carteraNominalCentavos),
          tipoValor: etiquetaNominal,
        }}
        secundaria={{
          valor: formatearImporte(kpis?.carteraRealCentavos),
          // No es "el valor real de la cartera": es cuanto valia esa plata cuando se
          // facturo, traida a pesos de hoy. Va etiquetado asi a proposito, porque es
          // mayor que el nominal y llamarlo "real" a secas se lee al reves de lo que
          // dice la nota. El valor real de lo que se va a cobrar esta en /mercado,
          // donde el simulador lo descuenta por los meses de espera.
          tipoValor: `valor a la emisión, en ${etiquetaMesBase}`,
        }}
        nota="La cartera se va a cobrar por su valor nominal, pero al facturarla esa plata valía más. La brecha es lo que la inflación licuó mientras la factura esperaba."
        formula="Suma de los saldos pendientes de v_saldo_facturas. La cifra de abajo reexpresa cada saldo a pesos del mes base con el IPC de su mes de emisión."
      />

      <TarjetaKpi
        titulo="Pérdida esperada (ECL)"
        icono={ShieldAlert}
        cargando={cargando}
        principal={{ valor: formatearImporte(kpis?.eclCentavos), tipoValor: etiquetaNominal }}
        secundaria={{
          valor: formatearPorcentaje(kpis?.eclSobreSaldo),
          tipoValor: 'del saldo de cartera',
        }}
        formula="Suma del saldo de cada bucket de aging por su tasa de pérdida esperada: 1% corriente, 2% a 30 días, 8%, 20%, 45% y 100% incobrable. Se aplica sobre la exposición entera, o sea que asume que de lo que no se cobra no se recupera nada."
      />

      <TarjetaKpi
        titulo="HHI de concentración"
        icono={PieChart}
        cargando={cargando}
        principal={{
          valor: formatearIndice(kpis?.hhi),
          tipoValor:
            kpis?.lecturaHhi === undefined || kpis.lecturaHhi === null
              ? 'sobre la facturación de 12 meses'
              : `${ETIQUETA_LECTURA_HHI[kpis.lecturaHhi]} · máximo teórico 10.000`,
        }}
        nota={
          kpis
            ? `Sobre ${formatearCantidad(kpis.clientesFacturados)} clientes facturados en los últimos 12 meses`
            : undefined
        }
        formula="Suma de los cuadrados de la participación porcentual de cada cliente en la facturación de los últimos 12 meses. Menos de 1.500 es cartera diversificada."
      />
    </section>
  )
}
