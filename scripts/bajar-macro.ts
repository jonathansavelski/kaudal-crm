/**
 * Baja las series macro REALES y las congela en scripts/datos-macro.json.
 *
 * Por que congelarlas en vez de que el seed las pida en vivo:
 * el seed tiene que ser determinista y funcionar sin internet. Si el IPC o el
 * MEP cambiaran entre dos corridas, los importes normalizados a ARS y a valor
 * real cambiarian con ellos y no habria forma de verificar un numero del
 * informe contra la base. Este script se corre a mano, cuando se quiere
 * actualizar la ventana, y su salida se versiona.
 *
 * Fuentes (publicas, sin API key):
 *   - Inflacion mensual INDEC:
 *     https://api.argentinadatos.com/v1/finanzas/indices/inflacion
 *   - Cotizaciones historicas del dolar:
 *     https://api.argentinadatos.com/v1/cotizaciones/dolares
 *
 * Uso:  npx tsx scripts/bajar-macro.ts
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Parametros
// ---------------------------------------------------------------------------

/** Meses de historia que necesita el CRM. El seed genera 36 meses de negocio. */
const MESES_DE_HISTORIA = 36

const URL_INFLACION = 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion'
const URL_DOLARES = 'https://api.argentinadatos.com/v1/cotizaciones/dolares'

/**
 * Mapeo de casas del API al enum casa_cambio de la base.
 * argentinadatos llama "bolsa" al MEP y "contadoconliqui" al CCL. Las casas que
 * no estan en este mapa (cripto, por ejemplo) se descartan.
 */
const CASAS: Readonly<Record<string, string>> = {
  oficial: 'oficial',
  bolsa: 'mep',
  contadoconliqui: 'ccl',
  blue: 'blue',
  tarjeta: 'tarjeta',
  mayorista: 'mayorista',
}

// ---------------------------------------------------------------------------
// Tipos de la salida congelada
// ---------------------------------------------------------------------------

export type FilaIpc = {
  /** Primer dia del mes, ISO 'YYYY-MM-01'. */
  periodo: string
  /** Indice base 100 en el primer periodo de la serie. */
  indice: number
  /** Fraccion decimal, no porcentaje: 0.021 = 2,1%. */
  variacion_mensual: number
}

export type FilaTipoCambio = {
  fecha: string
  casa: string
  compra_centavos: number
  venta_centavos: number
}

export type DatosMacro = {
  generado_en: string
  fuentes: { inflacion: string; dolares: string }
  ventana: { desde: string; hasta: string }
  ipc: FilaIpc[]
  tipo_cambio: FilaTipoCambio[]
}

// ---------------------------------------------------------------------------
// Validacion de las respuestas (nada de any: entra unknown y se valida)
// ---------------------------------------------------------------------------

type FilaInflacionApi = { fecha: string; valor: number }
type FilaDolarApi = { casa: string; fecha: string; compra: number | null; venta: number | null }

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function esFilaInflacion(valor: unknown): valor is FilaInflacionApi {
  return esObjeto(valor) && typeof valor['fecha'] === 'string' && typeof valor['valor'] === 'number'
}

function esFilaDolar(valor: unknown): valor is FilaDolarApi {
  if (!esObjeto(valor)) return false
  const compraOk = typeof valor['compra'] === 'number' || valor['compra'] === null
  const ventaOk = typeof valor['venta'] === 'number' || valor['venta'] === null
  return typeof valor['casa'] === 'string' && typeof valor['fecha'] === 'string' && compraOk && ventaOk
}

async function bajarJson(url: string): Promise<unknown> {
  const respuesta = await fetch(url, { headers: { accept: 'application/json' } })
  if (!respuesta.ok) {
    throw new Error(`${url} respondio ${respuesta.status} ${respuesta.statusText}`)
  }
  return (await respuesta.json()) as unknown
}

// ---------------------------------------------------------------------------
// Helpers de fecha (todo en UTC y como string 'YYYY-MM-DD', para que el huso
// horario local no corra un dia ninguna fecha)
// ---------------------------------------------------------------------------

function primerDiaDelMes(fechaIso: string): string {
  return `${fechaIso.slice(0, 7)}-01`
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function construirSerieIpc(crudo: unknown): FilaIpc[] {
  if (!Array.isArray(crudo)) throw new Error('La respuesta de inflacion no es un array')

  const filas = crudo.filter(esFilaInflacion)
  if (filas.length < MESES_DE_HISTORIA) {
    throw new Error(`Inflacion: llegaron ${filas.length} registros validos, hacen falta ${MESES_DE_HISTORIA}`)
  }

  // El API entrega el ultimo dia del mes; el esquema guarda el primero.
  const ordenadas = [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ventana = ordenadas.slice(-MESES_DE_HISTORIA)

  const serie: FilaIpc[] = []
  let indice = 100

  for (const [posicion, fila] of ventana.entries()) {
    const variacion = fila.valor / 100
    // Base 100 en el primer mes de la ventana: la variacion de ese mes queda
    // registrada pero no se aplica, porque no hay mes anterior contra el cual
    // acumular. De ahi en adelante, indice[n] = indice[n-1] * (1 + variacion).
    if (posicion > 0) indice = indice * (1 + variacion)

    serie.push({
      periodo: primerDiaDelMes(fila.fecha),
      indice: Number(indice.toFixed(6)),
      variacion_mensual: Number(variacion.toFixed(5)),
    })
  }

  return serie
}

// ---------------------------------------------------------------------------
// Tipo de cambio
// ---------------------------------------------------------------------------

function construirSerieTipoCambio(crudo: unknown, desde: string, hasta: string): FilaTipoCambio[] {
  if (!Array.isArray(crudo)) throw new Error('La respuesta de dolares no es un array')

  const porClave = new Map<string, FilaTipoCambio>()
  let descartadasPorCasa = 0
  let descartadasPorValor = 0

  for (const cruda of crudo) {
    if (!esFilaDolar(cruda)) continue

    const casa = CASAS[cruda.casa]
    if (casa === undefined) {
      descartadasPorCasa += 1
      continue
    }

    const fecha = cruda.fecha.slice(0, 10)
    if (fecha < desde || fecha > hasta) continue

    // Algunas casas (mayorista, tarjeta) publican solo venta.
    const venta = cruda.venta ?? cruda.compra
    const compra = cruda.compra ?? cruda.venta
    if (venta === null || compra === null || venta <= 0 || compra <= 0) {
      descartadasPorValor += 1
      continue
    }

    // El esquema exige venta >= compra; si el dato viene invertido se ordena.
    const compraCentavos = Math.round(Math.min(compra, venta) * 100)
    const ventaCentavos = Math.round(Math.max(compra, venta) * 100)

    // Ultimo registro del dia gana: el API a veces publica varios intradiarios.
    porClave.set(`${fecha}|${casa}`, {
      fecha,
      casa,
      compra_centavos: compraCentavos,
      venta_centavos: ventaCentavos,
    })
  }

  console.log(
    `  cotizaciones descartadas: ${descartadasPorCasa} por casa fuera del enum, ` +
      `${descartadasPorValor} por compra y venta nulas`,
  )

  return [...porClave.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.casa.localeCompare(b.casa),
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Bajando inflacion mensual...')
  const ipc = construirSerieIpc(await bajarJson(URL_INFLACION))

  const primerIpc = ipc[0]
  const ultimoIpc = ipc[ipc.length - 1]
  if (primerIpc === undefined || ultimoIpc === undefined) throw new Error('Serie de IPC vacia')

  const desde = primerIpc.periodo
  const hasta = hoyIso()

  const acumulado = (ultimoIpc.indice / primerIpc.indice - 1) * 100
  const peor = ipc.reduce((a, b) => (b.variacion_mensual > a.variacion_mensual ? b : a), primerIpc)

  console.log(`  ${ipc.length} meses: ${desde} a ${ultimoIpc.periodo}`)
  console.log(`  inflacion acumulada de la ventana: ${acumulado.toFixed(1)}%`)
  console.log(`  peor mes: ${peor.periodo} con ${(peor.variacion_mensual * 100).toFixed(1)}%`)

  console.log('Bajando cotizaciones historicas del dolar (son ~30.000 registros)...')
  const tipoCambio = construirSerieTipoCambio(await bajarJson(URL_DOLARES), desde, hasta)

  const porCasa = new Map<string, number>()
  for (const fila of tipoCambio) porCasa.set(fila.casa, (porCasa.get(fila.casa) ?? 0) + 1)
  console.log(`  ${tipoCambio.length} cotizaciones entre ${desde} y ${hasta}`)
  for (const [casa, cantidad] of [...porCasa].sort()) {
    console.log(`    ${casa.padEnd(10)} ${cantidad} dias`)
  }

  const mepFaltante = porCasa.get('mep') ?? 0
  if (mepFaltante === 0) throw new Error('No quedo ninguna cotizacion MEP: sin ella no se normaliza nada')

  const datos: DatosMacro = {
    generado_en: new Date().toISOString(),
    fuentes: { inflacion: URL_INFLACION, dolares: URL_DOLARES },
    ventana: { desde, hasta },
    ipc,
    tipo_cambio: tipoCambio,
  }

  const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), 'datos-macro.json')
  await writeFile(destino, `${JSON.stringify(datos, null, 2)}\n`, 'utf8')
  console.log(`\nCongelado en ${destino}`)
}

main().catch((error: unknown) => {
  console.error('bajar-macro fallo:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
