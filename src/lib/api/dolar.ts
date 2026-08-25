/**
 * Cliente de https://dolarapi.com/v1/dolares — cotizaciones del dolar en vivo.
 *
 * La respuesta es de un tercero, asi que entra como `unknown` y se valida con un type
 * guard antes de tocarla (rule `stack.md` §1). Nada de `as any`: un cambio de contrato
 * del API tiene que terminar en un error manejado, no en un `NaN` en la topbar.
 */

import type { Enums } from '@/types/supabase'

export type CasaCambio = Enums<'casa_cambio'>

/** Una cotizacion ya normalizada al vocabulario de Kaudal: centavos enteros. */
export type Cotizacion = {
  casa: CasaCambio
  compraCentavos: number
  ventaCentavos: number
  actualizado: Date
}

const URL_DOLARES = 'https://dolarapi.com/v1/dolares'

/** Como llama dolarapi a cada casa vs. como la llama el enum de Postgres. */
const CASAS: Readonly<Record<string, CasaCambio>> = {
  oficial: 'oficial',
  blue: 'blue',
  bolsa: 'mep',
  contadoconliqui: 'ccl',
  tarjeta: 'tarjeta',
  mayorista: 'mayorista',
}

type ItemDolar = {
  casa: string
  compra: number | null
  venta: number
  fechaActualizacion: string
}

function esItemDolar(valor: unknown): valor is ItemDolar {
  if (typeof valor !== 'object' || valor === null) return false

  const item = valor as Record<string, unknown>
  return (
    typeof item['casa'] === 'string' &&
    typeof item['venta'] === 'number' &&
    Number.isFinite(item['venta']) &&
    (item['compra'] === null ||
      (typeof item['compra'] === 'number' && Number.isFinite(item['compra']))) &&
    typeof item['fechaActualizacion'] === 'string'
  )
}

function esRespuestaDolar(valor: unknown): valor is ItemDolar[] {
  return Array.isArray(valor) && valor.every(esItemDolar)
}

/** El API devuelve pesos con decimales; adentro de Kaudal la plata es entera. */
function aCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

/**
 * Trae las cotizaciones del dia. Lanza si el API no responde, si tarda mas de 8 segundos
 * o si la forma de la respuesta cambio: el hook de arriba decide el fallback.
 */
export async function obtenerCotizacionesEnVivo(): Promise<Cotizacion[]> {
  const respuesta = await fetch(URL_DOLARES, { signal: AbortSignal.timeout(8_000) })
  if (!respuesta.ok) throw new Error(`dolarapi respondió ${respuesta.status}`)

  const crudo: unknown = await respuesta.json()
  if (!esRespuestaDolar(crudo)) throw new Error('Respuesta inesperada de dolarapi')

  const cotizaciones: Cotizacion[] = []
  for (const item of crudo) {
    const casa = CASAS[item.casa]
    if (!casa) continue

    const actualizado = new Date(item.fechaActualizacion)
    cotizaciones.push({
      casa,
      compraCentavos: aCentavos(item.compra ?? item.venta),
      ventaCentavos: aCentavos(item.venta),
      actualizado: Number.isNaN(actualizado.getTime()) ? new Date() : actualizado,
    })
  }

  if (cotizaciones.length === 0) throw new Error('dolarapi no devolvió ninguna casa conocida')

  return cotizaciones
}
