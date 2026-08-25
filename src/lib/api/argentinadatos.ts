/**
 * Cliente de api.argentinadatos.com — riesgo pais y tasas de plazo fijo.
 *
 * Mismo patron que `dolar.ts`: la respuesta de un tercero entra como `unknown` y se
 * valida con un type guard antes de tocarla. Nada de `as any`. Si el API cambia el
 * contrato o no responde, la query queda en error y la UI muestra su cartel con
 * reintentar; nunca un `NaN`.
 */

const URL_RIESGO_PAIS = 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo'
const URL_PLAZO_FIJO = 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo'

const TIMEOUT_MS = 8_000

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

async function traerJson(url: string): Promise<unknown> {
  const respuesta = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}`)

  return (await respuesta.json()) as unknown
}

// ---------------------------------------------------------------------------
// Riesgo pais
// ---------------------------------------------------------------------------

export type RiesgoPais = {
  fecha: string
  puntosBasicos: number
}

function esRiesgoPais(valor: unknown): valor is { fecha: string; valor: number } {
  return esObjeto(valor) && typeof valor['fecha'] === 'string' && numeroFinito(valor['valor'])
}

export async function obtenerRiesgoPais(): Promise<RiesgoPais> {
  const crudo = await traerJson(URL_RIESGO_PAIS)
  if (!esRiesgoPais(crudo)) throw new Error('Respuesta inesperada de argentinadatos (riesgo país)')

  return { fecha: crudo.fecha, puntosBasicos: Math.round(crudo.valor) }
}

// ---------------------------------------------------------------------------
// Tasas de plazo fijo
// ---------------------------------------------------------------------------

export type TasaPlazoFijo = {
  entidad: string
  /** TNA como fraccion: 0,31 = 31% anual. */
  tna: number
}

function esItemTasa(valor: unknown): valor is { entidad: string; tnaClientes: unknown } {
  return esObjeto(valor) && typeof valor['entidad'] === 'string'
}

/**
 * El API devuelve la TNA de clientes ya como fraccion (0,31). Algunas entidades la
 * mandan en `null` cuando no ofrecen el producto: esas se descartan.
 */
export async function obtenerTasasPlazoFijo(): Promise<TasaPlazoFijo[]> {
  const crudo = await traerJson(URL_PLAZO_FIJO)
  if (!Array.isArray(crudo)) throw new Error('Respuesta inesperada de argentinadatos (tasas)')

  const tasas: TasaPlazoFijo[] = []
  for (const item of crudo) {
    if (!esItemTasa(item)) continue
    const tna = item.tnaClientes
    if (!numeroFinito(tna) || tna <= 0) continue

    tasas.push({ entidad: item.entidad, tna })
  }

  if (tasas.length === 0) throw new Error('argentinadatos no devolvió ninguna tasa usable')

  return tasas.sort((a, b) => b.tna - a.tna)
}
