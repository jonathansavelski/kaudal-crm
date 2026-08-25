/**
 * Armado del dataset completo del dashboard.
 *
 * Recibe las filas crudas de Supabase y devuelve todo lo que las tarjetas y los graficos
 * necesitan **ya calculado**, para que ningun componente tenga que sumar centavos.
 * Cada numero sale de una funcion de `src/lib/metricas/`.
 */

import type {
  FilaAccion,
  FilaCampania,
  FilaContacto,
  FilaContrato,
  FilaCobro,
  FilaEmpresa,
  FilaFactura,
  FilaIpc,
  FilaMep,
  FilaOportunidad,
} from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArsHoy, armarContextoMacro } from '@/lib/agregados/contexto'
import { armarCanales } from '@/lib/agregados/canales'
import { rankearClientes } from '@/lib/agregados/clientes'
import { armarEmbudo, armarSectores, normalizarOportunidades } from '@/lib/agregados/comercial'
import {
  aFacturasConSaldo,
  calcularDsoDeCartera,
  calcularSaldoCartera,
  facturacionUltimos12Meses,
  indexarCobros,
  repartirAging,
  sanearFacturas,
} from '@/lib/agregados/facturas'
import { armarSerieMensual } from '@/lib/agregados/series'
import type {
  ClienteRankeado,
  FilaCanal,
  PorcionAging,
  PorcionSector,
  PuntoSerieMensual,
  TramoEmbudo,
} from '@/lib/agregados/tipos'
import { calcularAging } from '@/lib/metricas/cobranzas'
import { aUsdMep } from '@/lib/metricas/moneda'
import { calcularPipelinePonderado, esEtapaAbierta } from '@/lib/metricas/pipeline'
import { calcularEcl, calcularHhi, clasificarHhi } from '@/lib/metricas/riesgo'
import { calcularMrr } from '@/lib/metricas/suscripciones'
import type { ContratoNormalizado, LecturaHhi } from '@/lib/metricas/tipos'

export type FilasCrudas = {
  facturas: readonly FilaFactura[]
  cobros: readonly FilaCobro[]
  empresas: readonly FilaEmpresa[]
  contactos: readonly FilaContacto[]
  contratos: readonly FilaContrato[]
  oportunidades: readonly FilaOportunidad[]
  acciones: readonly FilaAccion[]
  campanias: readonly FilaCampania[]
  ipc: readonly FilaIpc[]
  mep: readonly FilaMep[]
}

export type KpisDashboard = {
  mrrCentavos: number
  mrrUsdCentavos: number | null
  clientesActivos: number
  pipelinePonderadoCentavos: number
  oportunidadesAbiertas: number
  dsoDias: number | null
  saldoPromedioCentavos: number
  ventas12mCentavos: number
  carteraNominalCentavos: number
  carteraRealCentavos: number
  saldoArsCentavos: number
  saldoUsdNormalizadoCentavos: number
  eclCentavos: number
  eclSobreSaldo: number | null
  hhi: number | null
  lecturaHhi: LecturaHhi | null
  clientesFacturados: number
}

export type DatosDashboard = {
  contexto: ContextoMacro
  kpis: KpisDashboard
  serie: PuntoSerieMensual[]
  embudo: TramoEmbudo[]
  aging: PorcionAging[]
  sectores: PorcionSector[]
  canales: FilaCanal[]
  churnMensual: number | null
  accionesSinAtribuir: number
  topClientes: ClienteRankeado[]
  facturasSinCotizacion: number
}

/** Contratos activos valuados al ultimo MEP: el MRR es una foto de hoy. */
function contratosDeHoy(
  contratos: readonly FilaContrato[],
  contexto: ContextoMacro,
): ContratoNormalizado[] {
  const normalizados: ContratoNormalizado[] = []

  for (const contrato of contratos) {
    const abono = aArsHoy(contexto, contrato.abono_mensual_centavos, contrato.moneda)
    if (abono === null) continue
    normalizados.push({ abonoMensualArsCentavos: abono, estado: contrato.estado })
  }

  return normalizados
}

export function armarDashboard(filas: FilasCrudas, hoy: Date): DatosDashboard {
  const contexto = armarContextoMacro(filas.ipc, filas.mep)

  const { facturas, sinCotizacion } = sanearFacturas(filas.facturas, contexto)
  const cobrosPorFactura = indexarCobros(filas.cobros, facturas, contexto)

  const aging = calcularAging(aFacturasConSaldo(facturas), hoy)
  const cartera = calcularSaldoCartera(facturas)
  const eclCentavos = calcularEcl(aging)
  const dso = calcularDsoDeCartera(facturas, cobrosPorFactura, hoy)

  const facturacion12m = facturacionUltimos12Meses(facturas, hoy)
  const hhi = calcularHhi([...facturacion12m.values()])

  const mrrCentavos = calcularMrr(contratosDeHoy(filas.contratos, contexto))
  const clientesActivos = new Set(
    filas.contratos.filter((c) => c.estado === 'activo').map((c) => c.empresa_id),
  ).size

  const oportunidadesNormalizadas = normalizarOportunidades(filas.oportunidades, contexto)
  const abiertas = oportunidadesNormalizadas.filter((o) => esEtapaAbierta(o.etapa))

  const canales = armarCanales({
    acciones: filas.acciones,
    campanias: filas.campanias,
    oportunidades: filas.oportunidades,
    contratos: filas.contratos,
    contexto,
    hoy,
  })

  return {
    contexto,
    kpis: {
      mrrCentavos,
      mrrUsdCentavos: aUsdMep(mrrCentavos, contexto.mepUltimoCentavos),
      clientesActivos,
      pipelinePonderadoCentavos: calcularPipelinePonderado(abiertas),
      oportunidadesAbiertas: abiertas.length,
      dsoDias: dso.dias,
      saldoPromedioCentavos: dso.saldoPromedioCentavos,
      ventas12mCentavos: dso.ventasCentavos,
      carteraNominalCentavos: cartera.nominalCentavos,
      carteraRealCentavos: cartera.realCentavos,
      saldoArsCentavos: cartera.saldoArsCentavos,
      saldoUsdNormalizadoCentavos: cartera.saldoUsdNormalizadoCentavos,
      eclCentavos,
      eclSobreSaldo:
        cartera.nominalCentavos > 0 ? eclCentavos / cartera.nominalCentavos : null,
      hhi,
      lecturaHhi: hhi === null ? null : clasificarHhi(hhi),
      clientesFacturados: facturacion12m.size,
    },
    serie: armarSerieMensual(facturas, filas.contratos, contexto, hoy),
    embudo: armarEmbudo(abiertas),
    aging: repartirAging(aging),
    sectores: armarSectores(facturacion12m, filas.empresas),
    canales: canales.filas,
    churnMensual: canales.churnMensual,
    accionesSinAtribuir: canales.accionesSinAtribuir,
    topClientes: rankearClientes(facturas, facturacion12m, filas.empresas, hoy),
    facturasSinCotizacion: sinCotizacion,
  }
}
