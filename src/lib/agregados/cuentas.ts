/**
 * Dataset de `/cuentas`: una fila por empresa, con sus metricas propias ya calculadas.
 *
 * Ningun componente suma centavos: todo lo que la tabla muestra sale de aca, y cada
 * numero financiero de una funcion de `src/lib/metricas/`.
 */

import { differenceInCalendarMonths, subDays } from 'date-fns'

import type { FilaContrato, FilaEmpresa, FilaOportunidad } from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArsHoy } from '@/lib/agregados/contexto'
import { moraDeFactura } from '@/lib/agregados/clientes'
import { aFechaLocal, aIso } from '@/lib/agregados/facturas'
import type { FacturaSaneada } from '@/lib/agregados/tipos'
import { deflactar } from '@/lib/metricas/moneda'
import { esEtapaAbierta } from '@/lib/metricas/pipeline'
import { calcularScoreDeRiesgo } from '@/lib/metricas/riesgo'
import type { Enums } from '@/types/supabase'

const DIAS_ANIO = 365

export type EstadoComercial = Enums<'estado_comercial'>
export type TamanioEmpresa = Enums<'tamanio_empresa'>
export type SectorEmpresa = Enums<'sector_empresa'>

export type FilaCuenta = {
  id: string
  razonSocial: string
  cuit: string
  sector: SectorEmpresa
  tamanio: TamanioEmpresa
  provincia: string
  ciudad: string
  owner: string
  estadoComercial: EstadoComercial
  fechaAlta: string
  mesesAntiguedad: number
  /** Facturado en los ultimos 12 meses, normalizado a ARS. Nominal. */
  facturacion12mCentavos: number
  /** Lo mismo, reexpresado a pesos del mes base del contexto macro. */
  facturacion12mRealCentavos: number
  saldoCentavos: number
  cantidadFacturas: number
  moraPromedioDias: number
  pctFueraDeTermino: number
  score: number
  /** Abono mensual del contrato vigente, en ARS. `null` si la cuenta no tiene contrato. */
  abonoMensualCentavos: number | null
  estadoContrato: Enums<'estado_contrato'> | null
  oportunidadesAbiertas: number
  pipelineCentavos: number
}

type Acumulado = {
  facturas: number
  fueraDeTermino: number
  sumaMora: number
  saldo: number
  facturacion: number
  facturacionReal: number
}

function acumuladoVacio(): Acumulado {
  return {
    facturas: 0,
    fueraDeTermino: 0,
    sumaMora: 0,
    saldo: 0,
    facturacion: 0,
    facturacionReal: 0,
  }
}

/**
 * Acumula por empresa: facturas, mora, saldo y facturacion de los ultimos 12 meses en
 * nominal y en real. Una sola pasada sobre la cartera.
 */
function acumularPorEmpresa(
  facturas: readonly FacturaSaneada[],
  contexto: ContextoMacro,
  hoy: Date,
): Map<string, Acumulado> {
  const desde = aIso(subDays(hoy, DIAS_ANIO))
  const porEmpresa = new Map<string, Acumulado>()

  for (const factura of facturas) {
    const acumulado = porEmpresa.get(factura.empresaId) ?? acumuladoVacio()
    const mora = moraDeFactura(factura)

    acumulado.facturas += 1
    acumulado.sumaMora += mora
    if (mora > 0) acumulado.fueraDeTermino += 1
    if (factura.saldoArsCentavos > 0) acumulado.saldo += factura.saldoArsCentavos

    if (factura.fechaEmision > desde) {
      acumulado.facturacion += factura.montoArsCentavos
      const indice = contexto.indiceDeFecha(factura.fechaEmision)
      const real =
        indice === null ? null : deflactar(factura.montoArsCentavos, indice, contexto.indiceBase)
      // Sin IPC para el mes de emision no hay valor real: se cae al nominal antes que
      // pisar el importe con cero, que licuaria la facturacion en silencio.
      acumulado.facturacionReal += real ?? factura.montoArsCentavos
    }

    porEmpresa.set(factura.empresaId, acumulado)
  }

  return porEmpresa
}

/** Gana el contrato activo; si no hay ninguno activo, el ultimo por fecha de inicio. */
function contratosVigentes(contratos: readonly FilaContrato[]): Map<string, FilaContrato> {
  const vigente = new Map<string, FilaContrato>()

  for (const contrato of contratos) {
    const previo = vigente.get(contrato.empresa_id)
    if (!previo) {
      vigente.set(contrato.empresa_id, contrato)
      continue
    }
    if (contrato.estado === 'activo' && previo.estado !== 'activo') {
      vigente.set(contrato.empresa_id, contrato)
      continue
    }
    if (contrato.estado === previo.estado && contrato.fecha_inicio > previo.fecha_inicio) {
      vigente.set(contrato.empresa_id, contrato)
    }
  }

  return vigente
}

export function armarCuentas(
  filas: {
    empresas: readonly FilaEmpresa[]
    contratos: readonly FilaContrato[]
    oportunidades: readonly FilaOportunidad[]
  },
  facturas: readonly FacturaSaneada[],
  contexto: ContextoMacro,
  hoy: Date,
): FilaCuenta[] {
  const porEmpresa = acumularPorEmpresa(facturas, contexto, hoy)
  const facturacionTotal = [...porEmpresa.values()].reduce(
    (suma, acumulado) => suma + acumulado.facturacion,
    0,
  )
  const vigente = contratosVigentes(filas.contratos)

  const pipeline = new Map<string, { cantidad: number; centavos: number }>()
  for (const oportunidad of filas.oportunidades) {
    if (!esEtapaAbierta(oportunidad.etapa)) continue

    const monto = aArsHoy(contexto, oportunidad.monto_centavos, oportunidad.moneda) ?? 0
    const previo = pipeline.get(oportunidad.empresa_id) ?? { cantidad: 0, centavos: 0 }
    pipeline.set(oportunidad.empresa_id, {
      cantidad: previo.cantidad + 1,
      centavos: previo.centavos + monto,
    })
  }

  return filas.empresas.map((empresa) => {
    const acumulado = porEmpresa.get(empresa.id) ?? acumuladoVacio()
    const contrato = vigente.get(empresa.id)
    const abono = contrato
      ? aArsHoy(contexto, contrato.abono_mensual_centavos, contrato.moneda)
      : null
    const enPipeline = pipeline.get(empresa.id) ?? { cantidad: 0, centavos: 0 }

    const moraPromedioDias = acumulado.facturas > 0 ? acumulado.sumaMora / acumulado.facturas : 0
    const pctFueraDeTermino =
      acumulado.facturas > 0 ? acumulado.fueraDeTermino / acumulado.facturas : 0
    const mesesAntiguedad = Math.max(
      0,
      differenceInCalendarMonths(hoy, aFechaLocal(empresa.fecha_alta)),
    )

    return {
      id: empresa.id,
      razonSocial: empresa.razon_social,
      cuit: empresa.cuit,
      sector: empresa.sector,
      tamanio: empresa.tamanio,
      provincia: empresa.provincia,
      ciudad: empresa.ciudad,
      owner: empresa.owner_comercial,
      estadoComercial: empresa.estado_comercial,
      fechaAlta: empresa.fecha_alta,
      mesesAntiguedad,
      facturacion12mCentavos: acumulado.facturacion,
      facturacion12mRealCentavos: Math.round(acumulado.facturacionReal),
      saldoCentavos: acumulado.saldo,
      cantidadFacturas: acumulado.facturas,
      moraPromedioDias,
      pctFueraDeTermino,
      score: calcularScoreDeRiesgo({
        moraPromedioDias,
        pctFacturasFueraDeTermino: pctFueraDeTermino,
        mesesDeAntiguedad: mesesAntiguedad,
        shareFacturacion: facturacionTotal > 0 ? acumulado.facturacion / facturacionTotal : 0,
      }),
      abonoMensualCentavos: abono,
      estadoContrato: contrato?.estado ?? null,
      oportunidadesAbiertas: enPipeline.cantidad,
      pipelineCentavos: enPipeline.centavos,
    }
  })
}

// ---------------------------------------------------------------------------
// Filtrado
// ---------------------------------------------------------------------------

export type FiltrosCuentas = {
  busqueda: string
  estado: string
  sector: string
  tamanio: string
  provincia: string
  owner: string
  /** Cotas de facturacion de 12 meses, en **pesos** tal como las escribe el usuario. */
  factMin: string
  factMax: string
}

export const FILTROS_CUENTAS_VACIOS: FiltrosCuentas = {
  busqueda: '',
  estado: '',
  sector: '',
  tamanio: '',
  provincia: '',
  owner: '',
  factMin: '',
  factMax: '',
}

export function pesosACentavos(pesos: string): number | null {
  if (pesos.trim() === '') return null
  const valor = Number(pesos)
  return Number.isFinite(valor) ? Math.round(valor * 100) : null
}

const ACENTOS = new RegExp('[\u0300-\u036f]', 'g')

/** Busqueda sin acentos: "Logistica" tiene que encontrar "Logística". */
export function normalizarTexto(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(ACENTOS, '')
}

export function filtrarCuentas(
  cuentas: readonly FilaCuenta[],
  filtros: FiltrosCuentas,
): FilaCuenta[] {
  const busqueda = normalizarTexto(filtros.busqueda.trim())
  const minimo = pesosACentavos(filtros.factMin)
  const maximo = pesosACentavos(filtros.factMax)

  return cuentas.filter((cuenta) => {
    if (filtros.estado !== '' && cuenta.estadoComercial !== filtros.estado) return false
    if (filtros.sector !== '' && cuenta.sector !== filtros.sector) return false
    if (filtros.tamanio !== '' && cuenta.tamanio !== filtros.tamanio) return false
    if (filtros.provincia !== '' && cuenta.provincia !== filtros.provincia) return false
    if (filtros.owner !== '' && cuenta.owner !== filtros.owner) return false
    if (minimo !== null && cuenta.facturacion12mCentavos < minimo) return false
    if (maximo !== null && cuenta.facturacion12mCentavos > maximo) return false

    if (busqueda !== '') {
      const campos = normalizarTexto(
        [cuenta.razonSocial, cuenta.cuit, cuenta.ciudad, cuenta.provincia, cuenta.owner].join(' '),
      )
      if (!campos.includes(busqueda)) return false
    }

    return true
  })
}

/** Valores distintos de una columna, ordenados en `es-AR`, para armar los selectores. */
export function valoresUnicos<T>(filas: readonly T[], leer: (fila: T) => string): string[] {
  return [...new Set(filas.map(leer))].sort((a, b) => a.localeCompare(b, 'es-AR'))
}
