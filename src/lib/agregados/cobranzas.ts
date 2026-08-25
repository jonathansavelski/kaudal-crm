/**
 * Dataset de `/cobranzas`: aging con drill-down, DSO, VAN de la cartera y ECL.
 *
 * Todas las formulas son de `src/lib/metricas/cobranzas.ts` y `riesgo.ts`. Aca se arman
 * sus insumos y se etiqueta cada factura con su bucket, que es lo que habilita el
 * drill-down: hacer click en un bucket filtra la tabla por esa misma etiqueta.
 */

import type { FilaEmpresa } from '@/lib/api/consultas'
import { aFechaLocal } from '@/lib/agregados/facturas'
import type { CobrosPorFactura } from '@/lib/agregados/facturas'
import { calcularDsoDeCartera, repartirAging } from '@/lib/agregados/facturas'
import type { FacturaSaneada, PorcionAging } from '@/lib/agregados/tipos'
import { bucketDeFactura, calcularAging, calcularTea, calcularVanCartera } from '@/lib/metricas/cobranzas'
import { aUsdMep } from '@/lib/metricas/moneda'
import { calcularEcl } from '@/lib/metricas/riesgo'
import type { BucketAging, EstadoFactura, FacturaConSaldo, Moneda } from '@/lib/metricas/tipos'
import { BUCKETS_AGING } from '@/lib/metricas/tipos'

/** Fila de la tabla de facturas de `/cobranzas`, con su empresa y su bucket resueltos. */
export type FilaCobranza = {
  id: string
  numero: string
  empresaId: string
  razonSocial: string
  fechaEmision: string
  fechaVencimiento: string
  moneda: Moneda
  montoOriginalCentavos: number
  montoArsCentavos: number
  saldoArsCentavos: number
  saldoRealCentavos: number
  estadoVigente: EstadoFactura
  diasMora: number
  bucket: BucketAging
}

export type FiltrosCobranzas = {
  busqueda: string
  bucket: string
  estado: string
  moneda: string
  /** Solo las que tienen saldo pendiente. `'1'` o vacio. */
  soloPendientes: string
}

export const FILTROS_COBRANZAS_VACIOS: FiltrosCobranzas = {
  busqueda: '',
  bucket: '',
  estado: '',
  moneda: '',
  soloPendientes: '',
}

export type DatosCobranzas = {
  filas: FilaCobranza[]
  aging: PorcionAging[]
  dsoDias: number | null
  saldoPromedioCentavos: number
  ventas12mCentavos: number
  saldoNominalCentavos: number
  saldoRealCentavos: number
  saldoUsdCentavos: number | null
  eclCentavos: number
  eclSobreSaldo: number | null
  vanCentavos: number
  /** VAN menos saldo nominal: lo que la espera hasta el cobro le cuesta a la cartera. */
  costoDeEsperaCentavos: number
  teaAplicada: number
}

/** Adapta la cartera al tipo que piden `calcularAging` y `calcularVanCartera`. */
function aFacturasConSaldo(facturas: readonly FacturaSaneada[]): FacturaConSaldo[] {
  return facturas.map((factura) => ({
    saldoCentavos: factura.saldoArsCentavos,
    fechaVencimiento: aFechaLocal(factura.fechaVencimiento),
    estado: factura.estadoVigente,
  }))
}

/**
 * Una factura saneada a fila de pantalla, con su bucket de aging resuelto. Se exporta
 * porque la ficha de cuenta muestra la misma tabla filtrada por empresa: si cada una
 * calculara su bucket, `/cobranzas` y la ficha podrian discrepar para la misma factura.
 */
export function aFilaCobranza(
  factura: FacturaSaneada,
  razonSocial: string,
  hoy: Date,
): FilaCobranza {
  return {
    id: factura.id,
    numero: factura.numero,
    empresaId: factura.empresaId,
    razonSocial,
    fechaEmision: factura.fechaEmision,
    fechaVencimiento: factura.fechaVencimiento,
    moneda: factura.moneda,
    montoOriginalCentavos: factura.montoOriginalCentavos,
    montoArsCentavos: factura.montoArsCentavos,
    saldoArsCentavos: factura.saldoArsCentavos,
    saldoRealCentavos: factura.saldoRealCentavos,
    estadoVigente: factura.estadoVigente,
    diasMora: factura.diasMora,
    bucket: bucketDeFactura(
      {
        saldoCentavos: factura.saldoArsCentavos,
        fechaVencimiento: aFechaLocal(factura.fechaVencimiento),
        estado: factura.estadoVigente,
      },
      hoy,
    ),
  }
}

export function armarCobranzas(
  facturas: readonly FacturaSaneada[],
  cobrosPorFactura: CobrosPorFactura,
  empresas: readonly FilaEmpresa[],
  contexto: { mepUltimoCentavos: number },
  tnaAnual: number,
  hoy: Date,
): DatosCobranzas {
  const porEmpresa = new Map(empresas.map((empresa) => [empresa.id, empresa.razon_social]))
  const conSaldo = aFacturasConSaldo(facturas)

  const aging = calcularAging(conSaldo, hoy)
  const eclCentavos = calcularEcl(aging)
  const dso = calcularDsoDeCartera(facturas, cobrosPorFactura, hoy)
  const van = calcularVanCartera(conSaldo, tnaAnual, hoy)

  let saldoNominal = 0
  let saldoReal = 0

  const filas: FilaCobranza[] = facturas.map((factura) => {
    if (factura.saldoArsCentavos > 0) {
      saldoNominal += factura.saldoArsCentavos
      saldoReal += factura.saldoRealCentavos
    }

    return aFilaCobranza(factura, porEmpresa.get(factura.empresaId) ?? 'Cuenta dada de baja', hoy)
  })

  return {
    filas,
    aging: repartirAging(aging),
    dsoDias: dso.dias,
    saldoPromedioCentavos: dso.saldoPromedioCentavos,
    ventas12mCentavos: dso.ventasCentavos,
    saldoNominalCentavos: saldoNominal,
    saldoRealCentavos: saldoReal,
    saldoUsdCentavos: aUsdMep(saldoNominal, contexto.mepUltimoCentavos),
    eclCentavos,
    eclSobreSaldo: saldoNominal > 0 ? eclCentavos / saldoNominal : null,
    vanCentavos: van,
    costoDeEsperaCentavos: van - saldoNominal,
    teaAplicada: calcularTea(tnaAnual),
  }
}

export function filtrarCobranzas(
  filas: readonly FilaCobranza[],
  filtros: FiltrosCobranzas,
): FilaCobranza[] {
  const busqueda = filtros.busqueda.trim().toLowerCase()

  return filas.filter((fila) => {
    if (filtros.soloPendientes === '1' && fila.saldoArsCentavos <= 0) return false

    if (filtros.bucket !== '') {
      // El aging solo cuenta facturas con saldo: una saldada no es cartera. Filtrar por
      // bucket sin este corte mostraria facturas pagadas dentro de "+90" y el drill-down
      // devolveria mas filas de las que dice la barra del grafico.
      if (fila.saldoArsCentavos <= 0) return false
      if (fila.bucket !== filtros.bucket) return false
    }
    if (filtros.estado !== '' && fila.estadoVigente !== filtros.estado) return false
    if (filtros.moneda !== '' && fila.moneda !== filtros.moneda) return false

    if (busqueda !== '') {
      const campos = `${fila.numero} ${fila.razonSocial}`.toLowerCase()
      if (!campos.includes(busqueda)) return false
    }

    return true
  })
}

export const BUCKETS = BUCKETS_AGING
