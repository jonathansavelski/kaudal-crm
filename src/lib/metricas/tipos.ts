/**
 * Tipos compartidos por la capa de metricas.
 *
 * Los enums salen del esquema de Supabase para que un cambio de migracion rompa el
 * typecheck en vez de producir un numero creible y equivocado.
 */

import type { Enums } from '@/types/supabase'

export type Moneda = Enums<'moneda'>
export type Etapa = Enums<'etapa_oportunidad'>
export type EstadoContrato = Enums<'estado_contrato'>
export type EstadoFactura = Enums<'estado_factura'>
export type Canal = Enums<'canal_comercial'>

/**
 * Un importe nunca viaja suelto: siempre con su moneda al lado (rule dinero.md).
 * `centavos` es un entero; jamas un float con decimales de peso.
 */
export type Importe = {
  centavos: number
  moneda: Moneda
}

/** Los ocho canales comerciales, en el orden en que los declara el enum de Postgres. */
export const CANALES = [
  'email',
  'eventos',
  'linkedin',
  'google_ads',
  'contenido',
  'referidos',
  'telemarketing',
  'partners',
] as const satisfies readonly Canal[]

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** Oportunidad con el monto ya llevado a ARS (normalizarAArs corre antes). */
export type OportunidadNormalizada = {
  montoArsCentavos: number
  etapa: Etapa
}

/** Lo que el forecast necesita ademas: la ventana temporal de cierre. */
export type OportunidadConCierreEstimado = OportunidadNormalizada & {
  fechaCierreEstimada: Date
}

/** Lo minimo que necesita el ciclo de venta. */
export type OportunidadCerrada = {
  etapa: Etapa
  fechaCreacion: Date
  fechaCierreReal: Date | null
}

// ---------------------------------------------------------------------------
// Cobranzas
// ---------------------------------------------------------------------------

/**
 * Buckets de aging. `incobrable` es excluyente: una factura marcada incobrable no
 * aparece ademas en `+90`, porque si no el ECL la contaria dos veces.
 */
export const BUCKETS_AGING = ['corriente', '1-30', '31-60', '61-90', '+90', 'incobrable'] as const

export type BucketAging = (typeof BUCKETS_AGING)[number]

export type ResumenBucket = {
  saldoCentavos: number
  cantidad: number
}

export type Aging = Record<BucketAging, ResumenBucket>

/**
 * Factura con su saldo pendiente, ya normalizado a ARS.
 * El saldo lo calcula la vista `v_saldo_facturas`; la capa TS lo consume, no lo recalcula.
 */
export type FacturaConSaldo = {
  saldoCentavos: number
  fechaVencimiento: Date
  estado: EstadoFactura
  /**
   * Plazo promedio historico de mora de la empresa, en dias. Solo se usa para estimar
   * cuando se cobra una factura ya vencida. `null` o ausente => se asume 30 dias.
   */
  moraPromedioEmpresaDias?: number | null
}

/** Dias que se asumen hasta el cobro de una factura vencida sin historial de mora. */
export const DIAS_COBRO_SIN_HISTORIAL = 30

// ---------------------------------------------------------------------------
// Suscripciones
// ---------------------------------------------------------------------------

/** Contrato con el abono mensual ya llevado a ARS. */
export type ContratoNormalizado = {
  abonoMensualArsCentavos: number
  estado: EstadoContrato
}

/**
 * Componentes del NRR. La misma forma sirve para el NRR nominal y para el real:
 * lo que cambia es si los importes vienen deflactados o no.
 */
export type ComponentesNrr = {
  mrrInicialCentavos: number
  expansionCentavos: number
  contraccionCentavos: number
  churnCentavos: number
}

/** Costo y clientes nuevos atribuidos a un canal dentro del periodo. */
export type ResumenCanal = {
  canal: Canal
  costoArsCentavos: number
  clientesNuevos: number
}

// ---------------------------------------------------------------------------
// Riesgo
// ---------------------------------------------------------------------------

export type LecturaHhi = 'diversificada' | 'moderada' | 'concentrada'

export type ComponentesScoreRiesgo = {
  moraPromedioDias: number
  pctFacturasFueraDeTermino: number
  mesesDeAntiguedad: number
  shareFacturacion: number
}
