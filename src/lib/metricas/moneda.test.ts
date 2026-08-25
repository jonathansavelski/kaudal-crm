import { describe, expect, it } from 'vitest'

import { aUsdMep, deflactar, normalizarAArs } from '@/lib/metricas/moneda'
import type { Importe } from '@/lib/metricas/tipos'

describe('normalizarAArs', () => {
  it('convierte USD a ARS con la cotizacion MEP venta', () => {
    // USD 1.000 = 100.000 centavos; MEP venta $1.500 = 150.000 centavos
    // 100.000 x 150.000 / 100 = 150.000.000 centavos = $1.500.000
    const importe: Importe = { centavos: 100_000, moneda: 'USD' }
    expect(normalizarAArs(importe, 150_000)).toBe(150_000_000)
  })

  it('deja el importe intacto si ya esta en ARS', () => {
    const importe: Importe = { centavos: 987_654_321, moneda: 'ARS' }
    expect(normalizarAArs(importe, 150_000)).toBe(987_654_321)
  })

  it('devuelve centavos enteros aunque la cuenta de fraccion', () => {
    // USD 0,01 = 1 centavo; MEP $1.234,56 = 123.456 centavos
    // 1 x 123.456 / 100 = 1.234,56 -> 1.235
    const importe: Importe = { centavos: 1, moneda: 'USD' }
    const resultado = normalizarAArs(importe, 123_456)
    expect(resultado).toBe(1_235)
    expect(Number.isInteger(resultado)).toBe(true)
  })

  it('un importe en cero sigue siendo cero', () => {
    expect(normalizarAArs({ centavos: 0, moneda: 'USD' }, 150_000)).toBe(0)
  })
})

describe('deflactar', () => {
  it('lleva un nominal a pesos de un mes base mas viejo', () => {
    // $1.000.000 nominal (IPC 125) expresado en pesos del mes con IPC 100
    // 1.000.000 x 100 / 125 = $800.000 reales
    expect(deflactar(100_000_000, 125, 100)).toBe(80_000_000)
  })

  it('no invierte la direccion: el cociente es ipc_base / ipc_origen', () => {
    // El error tipico es hacer ipc_origen / ipc_base y devolver 1.250.000.
    expect(deflactar(100_000_000, 125, 100)).toBeLessThan(100_000_000)
    // Al reves, expresar un importe viejo en pesos de un mes mas nuevo lo agranda:
    // 1.000.000 x 125 / 100 = $1.250.000
    expect(deflactar(100_000_000, 100, 125)).toBe(125_000_000)
  })

  it('con el mismo indice no cambia nada', () => {
    expect(deflactar(100_000_000, 100, 100)).toBe(100_000_000)
  })

  it('devuelve null si el IPC de origen no es positivo', () => {
    expect(deflactar(100_000_000, 0, 100)).toBeNull()
    expect(deflactar(100_000_000, -5, 100)).toBeNull()
  })
})

describe('aUsdMep', () => {
  it('convierte ARS a USD con la cotizacion MEP venta', () => {
    // $1.500.000 = 150.000.000 centavos; MEP venta $1.500 = 150.000 centavos
    // 150.000.000 x 100 / 150.000 = 100.000 centavos = USD 1.000
    expect(aUsdMep(150_000_000, 150_000)).toBe(100_000)
  })

  it('es la vuelta de normalizarAArs', () => {
    const enArs = normalizarAArs({ centavos: 100_000, moneda: 'USD' }, 150_000)
    expect(enArs).toBe(150_000_000)
    expect(aUsdMep(enArs ?? 0, 150_000)).toBe(100_000)
  })

  it('sin cotizacion devuelve null, no 0', () => {
    // Devolver 0 seria peor que fallar: convertiria en silencio cada importe en
    // USD a cero y arrastraria el MRR, el pipeline y el HHI hacia abajo sin error.
    expect(normalizarAArs({ centavos: 20_000, moneda: 'USD' }, 0)).toBeNull()
    expect(normalizarAArs({ centavos: 20_000, moneda: 'USD' }, -1)).toBeNull()
    // Un importe que ya esta en ARS no necesita cotizacion.
    expect(normalizarAArs({ centavos: 20_000, moneda: 'ARS' }, 0)).toBe(20_000)
  })

  it('devuelve null si la cotizacion no es positiva, en vez de Infinity', () => {
    expect(aUsdMep(150_000_000, 0)).toBeNull()
    expect(aUsdMep(150_000_000, -1)).toBeNull()
  })
})
