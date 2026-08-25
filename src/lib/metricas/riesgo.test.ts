import { describe, expect, it } from 'vitest'

import { calcularAging } from '@/lib/metricas/cobranzas'
import {
  PD_POR_BUCKET,
  calcularCaidaPorSaltoMep,
  calcularEcl,
  calcularExposicionCambiaria,
  calcularHhi,
  calcularScoreDeRiesgo,
  clasificarHhi,
} from '@/lib/metricas/riesgo'
import type { Aging, FacturaConSaldo } from '@/lib/metricas/tipos'

describe('calcularHhi', () => {
  it('cuatro clientes con 40%, 30%, 20% y 10%', () => {
    // 40^2 + 30^2 + 20^2 + 10^2 = 1.600 + 900 + 400 + 100 = 3.000
    const facturacion = [40_000_000, 30_000_000, 20_000_000, 10_000_000]
    expect(calcularHhi(facturacion)).toBe(3_000)
  })

  it('un solo cliente da el maximo teorico de 10.000', () => {
    expect(calcularHhi([80_000_000])).toBe(10_000)
  })

  it('diez clientes iguales dan 1.000', () => {
    // cada uno 10% -> 10 x 10^2 = 1.000
    const facturacion = Array.from({ length: 10 }, () => 10_000_000)
    expect(calcularHhi(facturacion)).toBeCloseTo(1_000, 6)
  })

  it('devuelve null si la facturacion total es cero', () => {
    expect(calcularHhi([])).toBeNull()
    expect(calcularHhi([0, 0, 0])).toBeNull()
  })

  it('nunca se pasa de 10.000', () => {
    const hhi = calcularHhi([70_000_000, 20_000_000, 10_000_000])
    expect(hhi).toBeGreaterThan(0)
    expect(hhi).toBeLessThanOrEqual(10_000)
  })
})

describe('clasificarHhi', () => {
  it('usa los cortes del skill', () => {
    expect(clasificarHhi(1_000)).toBe('diversificada')
    expect(clasificarHhi(1_499)).toBe('diversificada')
    expect(clasificarHhi(1_500)).toBe('moderada')
    expect(clasificarHhi(2_500)).toBe('moderada')
    expect(clasificarHhi(3_000)).toBe('concentrada')
  })
})

describe('PD_POR_BUCKET', () => {
  it('tiene los seis buckets con las PD del skill', () => {
    expect(PD_POR_BUCKET).toEqual({
      corriente: 0.01,
      '1-30': 0.02,
      '31-60': 0.08,
      '61-90': 0.2,
      '+90': 0.45,
      incobrable: 1,
    })
  })
})

describe('calcularEcl', () => {
  const aging: Aging = {
    corriente: { saldoCentavos: 1_000_000_000, cantidad: 4 }, // $10.000.000
    '1-30': { saldoCentavos: 500_000_000, cantidad: 3 }, // $5.000.000
    '31-60': { saldoCentavos: 200_000_000, cantidad: 2 }, // $2.000.000
    '61-90': { saldoCentavos: 100_000_000, cantidad: 1 }, // $1.000.000
    '+90': { saldoCentavos: 100_000_000, cantidad: 1 }, // $1.000.000
    incobrable: { saldoCentavos: 50_000_000, cantidad: 1 }, // $500.000
  }

  it('pondera cada bucket por su probabilidad de default', () => {
    // corriente  10.000.000 x 0,01 = 100.000
    // 1-30        5.000.000 x 0,02 = 100.000
    // 31-60       2.000.000 x 0,08 = 160.000
    // 61-90       1.000.000 x 0,20 = 200.000
    // +90         1.000.000 x 0,45 = 450.000
    // incobrable    500.000 x 1,00 = 500.000
    // ECL = $1.510.000 -> 151.000.000 centavos
    expect(calcularEcl(aging)).toBe(151_000_000)
  })

  it('cartera vacia da ECL 0', () => {
    const vacio = calcularAging([], new Date(2026, 7, 25))
    expect(calcularEcl(vacio)).toBe(0)
  })

  it('no cuenta dos veces la incobrable: el aging ya la saca de +90', () => {
    const hoy = new Date(2026, 7, 25)
    const facturas: readonly FacturaConSaldo[] = [
      {
        saldoCentavos: 100_000_000,
        fechaVencimiento: new Date(2026, 0, 10), // 227 dias de mora
        estado: 'incobrable',
      },
    ]
    const calculado = calcularAging(facturas, hoy)

    expect(calculado['+90'].saldoCentavos).toBe(0)
    // 1.000.000 x 1,00 = $1.000.000, no 1.000.000 x 1,45 contando en los dos buckets
    expect(calcularEcl(calculado)).toBe(100_000_000)
  })

  it('el ECL nunca supera el saldo total de la cartera', () => {
    const total = Object.values(aging).reduce((a, b) => a + b.saldoCentavos, 0)
    expect(calcularEcl(aging)).toBeLessThanOrEqual(total)
  })
})

describe('calcularExposicionCambiaria', () => {
  it('cartera de $8.000.000 en ARS y USD equivalente a $2.000.000', () => {
    // 8.000.000 / 10.000.000 = 0,80 (80%)
    expect(calcularExposicionCambiaria(800_000_000, 200_000_000)).toBe(0.8)
  })

  it('cartera 100% en dolares da exposicion 0', () => {
    expect(calcularExposicionCambiaria(0, 200_000_000)).toBe(0)
  })

  it('devuelve null si la cartera esta vacia', () => {
    expect(calcularExposicionCambiaria(0, 0)).toBeNull()
  })
})

describe('calcularCaidaPorSaltoMep', () => {
  it('un salto del MEP de +25% licua 20% del valor en USD', () => {
    // caida = 1 - 1/1,25 = 1 - 0,80 = 0,20 (20%)
    expect(calcularCaidaPorSaltoMep(0.25)).toBe(0.2)
  })

  it('un salto del 100% licua la mitad', () => {
    // 1 - 1/2 = 0,50
    expect(calcularCaidaPorSaltoMep(1)).toBe(0.5)
  })

  it('sin salto no hay caida', () => {
    expect(calcularCaidaPorSaltoMep(0)).toBe(0)
  })

  it('devuelve null para un salto de -100% o peor', () => {
    expect(calcularCaidaPorSaltoMep(-1)).toBeNull()
    expect(calcularCaidaPorSaltoMep(-1.5)).toBeNull()
  })
})

describe('calcularScoreDeRiesgo', () => {
  it('caso del skill: 18 dias de mora, 25% fuera de termino, 30 meses, 5% de share', () => {
    // A: 100 - (18/90)x100 = 80,00 x 0,40 = 32,0
    // B: 100 x (1 - 0,25)  = 75,00 x 0,30 = 22,5
    // C: (30/36) x 100     = 83,33 x 0,15 = 12,5
    // D: 100 x (1 - 0,05/0,15) = 66,67 x 0,15 = 10,0
    // score = 77
    expect(
      calcularScoreDeRiesgo({
        moraPromedioDias: 18,
        pctFacturasFueraDeTermino: 0.25,
        mesesDeAntiguedad: 30,
        shareFacturacion: 0.05,
      }),
    ).toBe(77)
  })

  it('el cliente perfecto llega a 100', () => {
    // A=100, B=100, C=100 (36 meses), D=100 (share 0)
    expect(
      calcularScoreDeRiesgo({
        moraPromedioDias: 0,
        pctFacturasFueraDeTermino: 0,
        mesesDeAntiguedad: 36,
        shareFacturacion: 0,
      }),
    ).toBe(100)
  })

  it('el peor cliente llega a 0', () => {
    // 90 dias o mas de mora, todo fuera de termino, sin antiguedad, 15% o mas de share
    expect(
      calcularScoreDeRiesgo({
        moraPromedioDias: 120,
        pctFacturasFueraDeTermino: 1,
        mesesDeAntiguedad: 0,
        shareFacturacion: 0.3,
      }),
    ).toBe(0)
  })

  it('la concentracion penaliza aunque el cliente pague puntual', () => {
    const base = {
      moraPromedioDias: 0,
      pctFacturasFueraDeTermino: 0,
      mesesDeAntiguedad: 36,
    }
    const diversificado = calcularScoreDeRiesgo({ ...base, shareFacturacion: 0 })
    const concentrado = calcularScoreDeRiesgo({ ...base, shareFacturacion: 0.2 })

    // pierde los 15 puntos enteros del componente D
    expect(diversificado).toBe(100)
    expect(concentrado).toBe(85)
  })

  it('siempre queda entre 0 y 100, incluso con datos absurdos', () => {
    const score = calcularScoreDeRiesgo({
      moraPromedioDias: 900,
      pctFacturasFueraDeTermino: 2,
      mesesDeAntiguedad: 500,
      shareFacturacion: 5,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
