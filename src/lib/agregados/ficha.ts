/**
 * Dataset de `/cuentas/:id`: todo lo que muestra la ficha de una cuenta.
 *
 * Las metricas propias del cliente (facturacion 12 meses, saldo, mora, score, LTV) salen
 * de `src/lib/metricas/`; aca se juntan sus insumos. La ficha no calcula nada por su
 * cuenta: si lo hiciera, el score de la ficha y el del ranking del dashboard podrian
 * diferir para el mismo cliente.
 */

import type {
  FilaAccion,
  FilaCampania,
  FilaContacto,
  FilaContrato,
  FilaEmpresa,
  FilaOportunidad,
} from '@/lib/api/consultas'
import type { ContextoMacro } from '@/lib/agregados/contexto'
import { aArs, aArsHoy } from '@/lib/agregados/contexto'
import type { FilaCobranza } from '@/lib/agregados/cobranzas'
import { aFilaCobranza } from '@/lib/agregados/cobranzas'
import type { FilaCuenta } from '@/lib/agregados/cuentas'
import type { FacturaSaneada } from '@/lib/agregados/tipos'
import { aUsdMep } from '@/lib/metricas/moneda'
import { esEtapaAbierta } from '@/lib/metricas/pipeline'
import { calcularLtv } from '@/lib/metricas/suscripciones'
import type { Enums } from '@/types/supabase'

/** Un toque comercial listo para el timeline, con el nombre de su campania resuelto. */
export type EventoTimeline = {
  id: string
  fecha: string
  tipo: Enums<'tipo_accion'>
  resultado: Enums<'resultado_accion'>
  notas: string | null
  costoArsCentavos: number
  campania: string | null
  oportunidad: string | null
}

export type FichaCuenta = {
  empresa: FilaEmpresa
  metricas: FilaCuenta
  contactos: FilaContacto[]
  contratos: FilaContrato[]
  contratoVigente: FilaContrato | null
  abonoVigenteArsCentavos: number | null
  facturas: FilaCobranza[]
  oportunidades: FilaOportunidad[]
  oportunidadesAbiertas: number
  timeline: EventoTimeline[]
  costoAccionesArsCentavos: number
  /**
   * LTV estimado del cliente: `(abono mensual x margen) / churn`, con el churn de la
   * cartera. Es `null` cuando la cuenta no tiene abono o el churn es cero — un LTV
   * infinito no es un numero que se pueda mostrar.
   */
  ltvCentavos: number | null
  saldoUsdCentavos: number | null
}

export function armarFicha(
  empresaId: string,
  filas: {
    empresas: readonly FilaEmpresa[]
    contactos: readonly FilaContacto[]
    contratos: readonly FilaContrato[]
    oportunidades: readonly FilaOportunidad[]
    acciones: readonly FilaAccion[]
    campanias: readonly FilaCampania[]
  },
  cuentas: readonly FilaCuenta[],
  facturas: readonly FacturaSaneada[],
  contexto: ContextoMacro,
  churnMensual: number | null,
  hoy: Date,
): FichaCuenta | null {
  const empresa = filas.empresas.find((candidata) => candidata.id === empresaId)
  const metricas = cuentas.find((cuenta) => cuenta.id === empresaId)
  if (!empresa || !metricas) return null

  const contratos = filas.contratos
    .filter((contrato) => contrato.empresa_id === empresaId)
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))

  const contratoVigente = contratos.find((contrato) => contrato.estado === 'activo') ?? null
  const abonoVigente = contratoVigente
    ? aArsHoy(contexto, contratoVigente.abono_mensual_centavos, contratoVigente.moneda)
    : null

  const oportunidades = filas.oportunidades
    .filter((oportunidad) => oportunidad.empresa_id === empresaId)
    .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))

  const nombreCampania = new Map(filas.campanias.map((campania) => [campania.id, campania.nombre]))
  const tituloOportunidad = new Map(
    filas.oportunidades.map((oportunidad) => [oportunidad.id, oportunidad.titulo]),
  )

  let costoAcciones = 0
  const timeline: EventoTimeline[] = []

  for (const accion of filas.acciones) {
    if (accion.empresa_id !== empresaId) continue

    const costo = aArs(contexto, accion.costo_centavos, accion.moneda, accion.fecha) ?? 0
    costoAcciones += costo

    timeline.push({
      id: accion.id,
      fecha: accion.fecha,
      tipo: accion.tipo,
      resultado: accion.resultado,
      notas: accion.notas,
      costoArsCentavos: costo,
      campania: accion.campania_id ? (nombreCampania.get(accion.campania_id) ?? null) : null,
      oportunidad: accion.oportunidad_id
        ? (tituloOportunidad.get(accion.oportunidad_id) ?? null)
        : null,
    })
  }

  // Cronologico inverso: lo ultimo que paso con la cuenta va primero.
  timeline.sort((a, b) => b.fecha.localeCompare(a.fecha))

  return {
    empresa,
    metricas,
    contactos: filas.contactos.filter((contacto) => contacto.empresa_id === empresaId),
    contratos,
    contratoVigente,
    abonoVigenteArsCentavos: abonoVigente,
    facturas: facturas
      .filter((factura) => factura.empresaId === empresaId)
      .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision))
      .map((factura) => aFilaCobranza(factura, empresa.razon_social, hoy)),
    oportunidades,
    oportunidadesAbiertas: oportunidades.filter((oportunidad) => esEtapaAbierta(oportunidad.etapa))
      .length,
    timeline,
    costoAccionesArsCentavos: costoAcciones,
    ltvCentavos:
      abonoVigente === null || churnMensual === null ? null : calcularLtv(abonoVigente, churnMensual),
    saldoUsdCentavos: aUsdMep(metricas.saldoCentavos, contexto.mepUltimoCentavos),
  }
}
