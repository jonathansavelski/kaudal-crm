import { describe, expect, it } from 'vitest'

import { deflactar, normalizarAArs } from '@/lib/metricas/moneda'
import {
  calcularArpa,
  calcularCacPorCanal,
  calcularChurnMensual,
  calcularLtv,
  calcularMrr,
  calcularNrr,
} from '@/lib/metricas/suscripciones'
import type { ContratoNormalizado, ResumenCanal } from '@/lib/metricas/tipos'

describe('calcularMrr', () => {
  // USD 200 = 20.000 centavos; MEP venta $1.500 = 150.000 centavos -> $300.000
  const abonoEnDolares = normalizarAArs({ centavos: 20_000, moneda: 'USD' }, 150_000)

  const contratos: readonly ContratoNormalizado[] = [
    { abonoMensualArsCentavos: 50_000_000, estado: 'activo' }, // $500.000
    { abonoMensualArsCentavos: 30_000_000, estado: 'activo' }, // $300.000
    { abonoMensualArsCentavos: abonoEnDolares, estado: 'activo' }, // USD 200 = $300.000
    { abonoMensualArsCentavos: 40_000_000, estado: 'cancelado' }, // $400.000, no suma
  ]

  it('suma solo los contratos activos, con el USD ya normalizado', () => {
    // 500.000 + 300.000 + 300.000 = $1.100.000 -> 110.000.000 centavos
    expect(abonoEnDolares).toBe(30_000_000)
    expect(calcularMrr(contratos)).toBe(110_000_000)
  })

  it('los pausados tampoco suman', () => {
    const conPausado: readonly ContratoNormalizado[] = [
      ...contratos,
      { abonoMensualArsCentavos: 90_000_000, estado: 'pausado' },
    ]
    expect(calcularMrr(conPausado)).toBe(110_000_000)
  })

  it('sin contratos activos el MRR es 0', () => {
    expect(calcularMrr([])).toBe(0)
    expect(calcularMrr([{ abonoMensualArsCentavos: 90_000_000, estado: 'cancelado' }])).toBe(0)
  })
})

describe('calcularNrr', () => {
  it('caso del skill: expansion 200k, contraccion 50k, churn 100k sobre 1.000.000', () => {
    // (1.000.000 + 200.000 - 50.000 - 100.000) / 1.000.000 = 1.050.000 / 1.000.000 = 1,05
    expect(
      calcularNrr({
        mrrInicialCentavos: 100_000_000,
        expansionCentavos: 20_000_000,
        contraccionCentavos: 5_000_000,
        churnCentavos: 10_000_000,
      }),
    ).toBe(1.05)
  })

  it('devuelve fraccion, no porcentaje', () => {
    const nrr = calcularNrr({
      mrrInicialCentavos: 100_000_000,
      expansionCentavos: 20_000_000,
      contraccionCentavos: 5_000_000,
      churnCentavos: 10_000_000,
    })
    expect(nrr).toBeLessThan(2)
  })

  it('una cohorte que solo perdio da NRR menor a 1', () => {
    // (1.000.000 - 300.000) / 1.000.000 = 0,70
    expect(
      calcularNrr({
        mrrInicialCentavos: 100_000_000,
        expansionCentavos: 0,
        contraccionCentavos: 0,
        churnCentavos: 30_000_000,
      }),
    ).toBe(0.7)
  })

  it('devuelve null si el MRR inicial es cero', () => {
    expect(
      calcularNrr({
        mrrInicialCentavos: 0,
        expansionCentavos: 20_000_000,
        contraccionCentavos: 0,
        churnCentavos: 0,
      }),
    ).toBeNull()
  })

  it('la brecha nominal/real es el efecto inflacion', () => {
    // Cohorte con MRR inicial $1.000.000 en un mes de IPC 100.
    // Al cierre el abono subio $450.000 nominales, pero el IPC fue de 100 a 150:
    // esa suba es casi toda indexacion, no una decision de compra del cliente.
    const mrrInicialCentavos = 100_000_000
    const expansionNominal = 45_000_000

    const nrrNominal = calcularNrr({
      mrrInicialCentavos,
      expansionCentavos: expansionNominal,
      contraccionCentavos: 0,
      churnCentavos: 0,
    })

    // deflactado a pesos del mes inicial: 450.000 x 100/150 = $300.000
    const expansionReal = deflactar(expansionNominal, 150, 100)
    expect(expansionReal).toBe(30_000_000)

    const nrrReal = calcularNrr({
      mrrInicialCentavos,
      expansionCentavos: expansionReal ?? 0,
      contraccionCentavos: 0,
      churnCentavos: 0,
    })

    // 1.450.000 / 1.000.000 = 1,45  vs  1.300.000 / 1.000.000 = 1,30
    expect(nrrNominal).toBe(1.45)
    expect(nrrReal).toBe(1.3)
    expect(nrrReal!).toBeLessThan(nrrNominal!)
  })
})

describe('calcularChurnMensual', () => {
  it('3 contratos cancelados sobre 60 activos al inicio', () => {
    // 3 / 60 = 0,05 (5%)
    expect(calcularChurnMensual(3, 60)).toBe(0.05)
  })

  it('un mes sin bajas da churn 0, que es un resultado valido', () => {
    expect(calcularChurnMensual(0, 60)).toBe(0)
  })

  it('devuelve null si no habia clientes activos al inicio', () => {
    expect(calcularChurnMensual(0, 0)).toBeNull()
    expect(calcularChurnMensual(3, 0)).toBeNull()
  })
})

describe('calcularArpa', () => {
  it('MRR sobre clientes activos', () => {
    // 1.100.000 / 55 = $20.000 -> 2.000.000 centavos
    expect(calcularArpa(110_000_000, 55)).toBe(2_000_000)
  })

  it('con un solo cliente el ARPA es el MRR entero', () => {
    expect(calcularArpa(110_000_000, 1)).toBe(110_000_000)
  })

  it('devuelve null si no hay clientes activos', () => {
    expect(calcularArpa(110_000_000, 0)).toBeNull()
  })
})

describe('calcularCacPorCanal', () => {
  const resumenes: readonly ResumenCanal[] = [
    { canal: 'eventos', costoArsCentavos: 300_000_000, clientesNuevos: 6 }, // $3.000.000
    { canal: 'email', costoArsCentavos: 20_000_000, clientesNuevos: 0 }, // gasto sin resultado
    { canal: 'referidos', costoArsCentavos: 0, clientesNuevos: 4 }, // gratis
  ]

  it('costo del canal sobre clientes nuevos atribuidos', () => {
    // 3.000.000 / 6 = $500.000 por cliente -> 50.000.000 centavos
    expect(calcularCacPorCanal(resumenes).eventos).toBe(50_000_000)
  })

  it('un canal que gasto y no trajo clientes devuelve null, nunca 0', () => {
    expect(calcularCacPorCanal(resumenes).email).toBeNull()
  })

  it('un canal sin costo pero con clientes tiene CAC 0', () => {
    expect(calcularCacPorCanal(resumenes).referidos).toBe(0)
  })

  it('los canales sin datos quedan en null', () => {
    const cac = calcularCacPorCanal(resumenes)
    expect(cac.linkedin).toBeNull()
    expect(cac.partners).toBeNull()
  })

  it('acumula varias entradas del mismo canal', () => {
    // (1.000.000 + 2.000.000) / (2 + 4) = 3.000.000 / 6 = $500.000
    const cac = calcularCacPorCanal([
      { canal: 'eventos', costoArsCentavos: 100_000_000, clientesNuevos: 2 },
      { canal: 'eventos', costoArsCentavos: 200_000_000, clientesNuevos: 4 },
    ])
    expect(cac.eventos).toBe(50_000_000)
  })

  it('sin acciones devuelve todos los canales en null', () => {
    const cac = calcularCacPorCanal([])
    expect(Object.values(cac).every((valor) => valor === null)).toBe(true)
  })
})

describe('calcularLtv', () => {
  it('ARPA por margen sobre churn', () => {
    // (20.000 x 0,75) / 0,05 = 15.000 / 0,05 = $300.000 -> 30.000.000 centavos
    expect(calcularLtv(2_000_000, 0.05)).toBe(30_000_000)
  })

  it('el margen por defecto es 0,75', () => {
    expect(calcularLtv(2_000_000, 0.05)).toBe(calcularLtv(2_000_000, 0.05, 0.75))
  })

  it('con margen 1 el LTV es ARPA sobre churn', () => {
    // 20.000 / 0,05 = $400.000
    expect(calcularLtv(2_000_000, 0.05, 1)).toBe(40_000_000)
  })

  it('devuelve null con churn cero: un LTV infinito no se puede mostrar', () => {
    expect(calcularLtv(2_000_000, 0)).toBeNull()
  })

  it('el ratio LTV/CAC del ejemplo del skill queda por debajo de 1', () => {
    // LTV $300.000 contra CAC $500.000 -> 0,6: ese canal destruye valor
    const ltv = calcularLtv(2_000_000, 0.05)
    const cac = calcularCacPorCanal([
      { canal: 'eventos', costoArsCentavos: 300_000_000, clientesNuevos: 6 },
    ]).eventos
    expect(ltv! / cac!).toBeCloseTo(0.6, 10)
  })
})
