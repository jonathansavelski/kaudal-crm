/**
 * Tipos del armado de datasets.
 *
 * `src/lib/agregados/` es la capa que junta filas crudas de Supabase y las deja listas
 * para que las formulas de `src/lib/metricas/` operen sobre ellas. **No define ninguna
 * formula nueva**: agrupa, normaliza a ARS, deflacta con `deflactar` y llama a metricas.
 * Existe para que ningun componente termine haciendo un `reduce` sobre `_centavos`.
 */

import type { BucketAging, Canal, Etapa, EstadoFactura, Moneda } from '@/lib/metricas/tipos'

/** Factura de `v_saldo_facturas` ya saneada y normalizada a ARS. */
export type FacturaSaneada = {
  id: string
  /** Numero de factura visible: es lo que el usuario busca, no el uuid. */
  numero: string
  empresaId: string
  fechaEmision: string
  fechaVencimiento: string
  moneda: Moneda
  estadoVigente: EstadoFactura
  montoArsCentavos: number
  saldoArsCentavos: number
  /** Saldo reexpresado a pesos del mes base (rule `dinero.md` §3). */
  saldoRealCentavos: number
  /** Dias de mora vigentes; 0 si todavia no vencio. */
  diasMora: number
  /** Dias de mora con los que se cobro, si ya se cobro. */
  diasMoraAlCobro: number | null
  esUsd: boolean
  montoOriginalCentavos: number
  saldoOriginalCentavos: number
  cobradoOriginalCentavos: number
  cantidadCobros: number
  fechaUltimoCobro: string | null
}

export type PuntoSerieMensual = {
  /** Primer dia del mes, ISO. */
  periodo: string
  facturacionNominalCentavos: number
  facturacionRealCentavos: number
  mrrNominalCentavos: number
  mrrRealCentavos: number
  cantidadFacturas: number
}

export type TramoEmbudo = {
  etapa: Etapa
  etiqueta: string
  montoCentavos: number
  montoPonderadoCentavos: number
  cantidad: number
  probabilidad: number
}

export type PorcionAging = {
  bucket: BucketAging
  saldoCentavos: number
  cantidad: number
  participacion: number
}

export type PorcionSector = {
  sector: string
  etiqueta: string
  facturacionCentavos: number
  participacion: number
  cantidadClientes: number
}

export type FilaCanal = {
  canal: Canal
  etiqueta: string
  cacCentavos: number | null
  ltvCentavos: number | null
  ratio: number | null
  clientesNuevos: number
  costoCentavos: number
}

export type ClienteRankeado = {
  empresaId: string
  razonSocial: string
  facturacionCentavos: number
  saldoCentavos: number
  score: number
  moraPromedioDias: number
  share: number
}
