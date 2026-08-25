/**
 * Suscripciones: MRR, NRR, churn, ARPA, CAC por canal y LTV.
 *
 * Fuente de verdad: skill `metricas-financieras`.
 */

import type {
  Canal,
  ComponentesNrr,
  ContratoNormalizado,
  ResumenCanal,
} from '@/lib/metricas/tipos'
import { CANALES } from '@/lib/metricas/tipos'

/** Margen bruto por defecto del LTV. La UI lo deja pisar. */
export const MARGEN_BRUTO_POR_DEFECTO = 0.75

/**
 *     MRR = suma( abono_mensual_normalizado_ars )  sobre contratos activos
 *
 * Los contratos `pausado` y `cancelado` no suman. Las facturas de implementacion tampoco:
 * son one-shot por hito, no recurrentes.
 */
export function calcularMrr(contratos: readonly ContratoNormalizado[]): number {
  return contratos.reduce((acumulado, contrato) => {
    if (contrato.estado !== 'activo') return acumulado
    return acumulado + contrato.abonoMensualArsCentavos
  }, 0)
}

/**
 *     NRR = (MRR_inicial + expansion - contraccion - churn) / MRR_inicial
 *
 * Sobre la cohorte de clientes que ya existian al inicio del periodo. Los clientes nuevos
 * no entran: esa es la diferencia con el crecimiento bruto.
 *
 * La misma funcion sirve para el NRR **nominal** y para el **real**: lo que cambia es si
 * los componentes vienen deflactados a pesos del mes inicial (via `deflactar`) o no.
 * La brecha entre los dos es el efecto inflacion, y mostrarla es el punto de Kaudal: un
 * NRR nominal de 1,45 con un NRR real de 0,98 no es un negocio que crecio 45%.
 *
 * Devuelve `null` si el MRR inicial es cero (cohorte vacia: no hay retencion que medir).
 */
export function calcularNrr(componentes: ComponentesNrr): number | null {
  const { mrrInicialCentavos, expansionCentavos, contraccionCentavos, churnCentavos } = componentes

  if (mrrInicialCentavos <= 0) return null

  const mrrFinal = mrrInicialCentavos + expansionCentavos - contraccionCentavos - churnCentavos

  return mrrFinal / mrrInicialCentavos
}

/**
 *     churn_mensual = clientes_perdidos_en_el_mes / clientes_activos_al_inicio_del_mes
 *
 * "Perdido" = contrato que paso a `cancelado` en ese mes.
 * Devuelve `null` si no habia clientes activos al inicio.
 */
export function calcularChurnMensual(
  clientesPerdidos: number,
  clientesActivosAlInicio: number,
): number | null {
  if (clientesActivosAlInicio <= 0) return null

  return clientesPerdidos / clientesActivosAlInicio
}

/**
 *     ARPA = MRR / clientes_activos
 *
 * Devuelve `null` si no hay clientes activos.
 */
export function calcularArpa(mrrCentavos: number, clientesActivos: number): number | null {
  if (clientesActivos <= 0) return null

  return Math.round(mrrCentavos / clientesActivos)
}

function cacVacio(): Record<Canal, number | null> {
  const inicial = {} as Record<Canal, number | null>
  for (const canal of CANALES) inicial[canal] = null
  return inicial
}

/**
 *     CAC_canal = costo_total_acciones_del_canal / clientes_nuevos_atribuidos_al_canal
 *
 * Los costos entran ya normalizados a ARS. Varias entradas del mismo canal se acumulan.
 *
 * Un canal sin clientes nuevos devuelve `null`, no cero: un CAC infinito mostrado como
 * cero seria exactamente al reves de la verdad. Los canales sin datos quedan en `null`.
 */
export function calcularCacPorCanal(
  resumenes: readonly ResumenCanal[],
): Record<Canal, number | null> {
  const costo = {} as Record<Canal, number>
  const clientes = {} as Record<Canal, number>
  for (const canal of CANALES) {
    costo[canal] = 0
    clientes[canal] = 0
  }

  for (const resumen of resumenes) {
    costo[resumen.canal] += resumen.costoArsCentavos
    clientes[resumen.canal] += resumen.clientesNuevos
  }

  const cac = cacVacio()
  for (const canal of CANALES) {
    if (clientes[canal] <= 0) continue
    cac[canal] = Math.round(costo[canal] / clientes[canal])
  }

  return cac
}

/**
 *     LTV = (ARPA x margen_bruto) / churn_mensual
 *
 * Devuelve `null` si el churn es cero: un LTV infinito no es un numero que se pueda
 * mostrar, y ponerlo en cero mentiria en la direccion opuesta.
 */
export function calcularLtv(
  arpaCentavos: number,
  churnMensual: number,
  margenBruto: number = MARGEN_BRUTO_POR_DEFECTO,
): number | null {
  if (churnMensual <= 0) return null

  return Math.round((arpaCentavos * margenBruto) / churnMensual)
}
