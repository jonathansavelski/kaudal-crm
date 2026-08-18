/**
 * Aleatoriedad del seed. Una sola fuente: la instancia de faker sembrada con
 * SEMILLA. Nada de Math.random, ni de crypto.randomUUID, ni de Date.now: si
 * una sola llamada no fuera determinista, dos corridas darian datos distintos
 * y no habria contra que verificar los numeros del informe.
 *
 * Nota de locale: el skill pide `es_AR`, que faker 10 ya no trae (solo `es` y
 * `es_MX`). Se usa `es` para nombres y apellidos, y todo lo especificamente
 * argentino -- CUIT con digito verificador, provincias, ciudades,
 * caracteristicas telefonicas, formas societarias -- sale de lib/argentina.ts,
 * que es dato propio y no de faker.
 */

import { Faker, base, es } from '@faker-js/faker'

/** Semilla fija. Cambiarla cambia TODO el dataset. */
export const SEMILLA = 2026

export const faker = new Faker({ locale: [es, base] })

export function sembrar(): void {
  faker.seed(SEMILLA)
}

/** Uniforme en [0, 1). */
export function uniforme(): number {
  return faker.number.float({ min: 0, max: 0.999_999_999 })
}

/** Entero en [min, max], ambos inclusive. */
export function entero(min: number, max: number): number {
  return faker.number.int({ min, max })
}

/** true con probabilidad `p`. */
export function chance(p: number): boolean {
  return uniforme() < p
}

/** Normal(0, 1) por Box-Muller. */
export function normal(): number {
  const u1 = Math.max(uniforme(), 1e-12)
  const u2 = uniforme()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Log-normal truncada. Es la distribucion de los montos de la cartera: pocas
 * cuentas grandes y muchas chicas (skill seed-financiero). Con sigma entre
 * 0,7 y 0,9 aparece la cola larga que hace que el top-10 tenga relieve.
 */
export function logNormal(opciones: {
  mediana: number
  sigma: number
  minimo: number
  maximo: number
}): number {
  const valor = opciones.mediana * Math.exp(opciones.sigma * normal())
  return Math.round(Math.min(opciones.maximo, Math.max(opciones.minimo, valor)))
}

export function elegir<T>(opciones: readonly T[]): T {
  const elegida = opciones[entero(0, opciones.length - 1)]
  if (elegida === undefined) throw new Error('elegir() sobre una lista vacia')
  return elegida
}

export function elegirPonderado<T>(opciones: ReadonlyArray<readonly [T, number]>): T {
  const total = opciones.reduce((suma, [, peso]) => suma + peso, 0)
  let corte = uniforme() * total
  for (const [valor, peso] of opciones) {
    corte -= peso
    if (corte <= 0) return valor
  }
  const ultima = opciones[opciones.length - 1]
  if (ultima === undefined) throw new Error('elegirPonderado() sobre una lista vacia')
  return ultima[0]
}

/** Copia barajada, determinista (Fisher-Yates con el RNG de faker). */
export function barajar<T>(items: readonly T[]): T[] {
  const copia = [...items]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = entero(0, i)
    const a = copia[i]
    const b = copia[j]
    if (a === undefined || b === undefined) continue
    copia[i] = b
    copia[j] = a
  }
  return copia
}

/** UUID v4 determinista: sale del RNG sembrado, no del de la maquina. */
export function uuid(): string {
  return faker.string.uuid()
}

export function exigir<T>(valor: T | undefined | null, mensaje: string): T {
  if (valor === undefined || valor === null) throw new Error(mensaje)
  return valor
}
