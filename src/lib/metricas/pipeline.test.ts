import { describe, expect, it } from 'vitest'

import {
  PROBABILIDAD_POR_ETAPA,
  calcularCicloDeVenta,
  calcularForecast,
  calcularPipelinePonderado,
  esEtapaAbierta,
} from '@/lib/metricas/pipeline'
import type {
  OportunidadCerrada,
  OportunidadConCierreEstimado,
  OportunidadNormalizada,
} from '@/lib/metricas/tipos'

describe('PROBABILIDAD_POR_ETAPA', () => {
  it('tiene los siete valores de la tabla del skill', () => {
    expect(PROBABILIDAD_POR_ETAPA).toEqual({
      prospecto: 0.05,
      calificado: 0.15,
      demo: 0.3,
      propuesta: 0.5,
      negociacion: 0.75,
      ganada: 1,
      perdida: 0,
    })
  })

  it('son fracciones, no porcentajes', () => {
    for (const probabilidad of Object.values(PROBABILIDAD_POR_ETAPA)) {
      expect(probabilidad).toBeGreaterThanOrEqual(0)
      expect(probabilidad).toBeLessThanOrEqual(1)
    }
  })
})

describe('esEtapaAbierta', () => {
  it('cerradas son ganada y perdida; el resto esta abierta', () => {
    expect(esEtapaAbierta('ganada')).toBe(false)
    expect(esEtapaAbierta('perdida')).toBe(false)
    expect(esEtapaAbierta('prospecto')).toBe(true)
    expect(esEtapaAbierta('negociacion')).toBe(true)
  })
})

describe('calcularPipelinePonderado', () => {
  const oportunidades: readonly OportunidadNormalizada[] = [
    { montoArsCentavos: 100_000_000, etapa: 'demo' }, // $1.000.000
    { montoArsCentavos: 200_000_000, etapa: 'propuesta' }, // $2.000.000
    { montoArsCentavos: 150_000_000, etapa: 'negociacion' }, // $1.500.000
    { montoArsCentavos: 500_000_000, etapa: 'ganada' }, // $5.000.000, excluida
  ]

  it('pondera por etapa y excluye las cerradas', () => {
    // 1.000.000 x 0,30 =   300.000
    // 2.000.000 x 0,50 = 1.000.000
    // 1.500.000 x 0,75 = 1.125.000
    // 5.000.000 ganada -> excluida
    // total = 2.425.000 -> 242.500.000 centavos
    expect(calcularPipelinePonderado(oportunidades)).toBe(242_500_000)
  })

  it('tambien excluye las perdidas', () => {
    const conPerdida: readonly OportunidadNormalizada[] = [
      ...oportunidades,
      { montoArsCentavos: 900_000_000, etapa: 'perdida' },
    ]
    expect(calcularPipelinePonderado(conPerdida)).toBe(242_500_000)
  })

  it('pipeline vacio da 0, no null', () => {
    expect(calcularPipelinePonderado([])).toBe(0)
  })

  it('una cartera de solo cerradas da 0', () => {
    expect(
      calcularPipelinePonderado([
        { montoArsCentavos: 500_000_000, etapa: 'ganada' },
        { montoArsCentavos: 500_000_000, etapa: 'perdida' },
      ]),
    ).toBe(0)
  })

  it('devuelve centavos enteros', () => {
    // 1.234.567 centavos x 0,05 = 61.728,35 -> 61.728
    const resultado = calcularPipelinePonderado([
      { montoArsCentavos: 1_234_567, etapa: 'prospecto' },
    ])
    expect(resultado).toBe(61_728)
    expect(Number.isInteger(resultado)).toBe(true)
  })
})

describe('calcularCicloDeVenta', () => {
  const oportunidades: readonly OportunidadCerrada[] = [
    {
      etapa: 'ganada',
      fechaCreacion: new Date(2026, 0, 10), // 10/01/2026
      fechaCierreReal: new Date(2026, 2, 11), // 11/03/2026 -> 60 dias
    },
    {
      etapa: 'ganada',
      fechaCreacion: new Date(2026, 1, 1), // 01/02/2026
      fechaCierreReal: new Date(2026, 4, 2), // 02/05/2026 -> 90 dias
    },
  ]

  it('promedia los dias de las ganadas', () => {
    // (60 + 90) / 2 = 75 dias
    expect(calcularCicloDeVenta(oportunidades)).toBe(75)
  })

  it('ignora las no ganadas y las ganadas sin fecha de cierre real', () => {
    const conRuido: readonly OportunidadCerrada[] = [
      ...oportunidades,
      {
        etapa: 'perdida',
        fechaCreacion: new Date(2026, 0, 1),
        fechaCierreReal: new Date(2026, 11, 31), // 364 dias, no debe entrar
      },
      {
        etapa: 'ganada',
        fechaCreacion: new Date(2026, 0, 1),
        fechaCierreReal: null,
      },
    ]
    expect(calcularCicloDeVenta(conRuido)).toBe(75)
  })

  it('devuelve null si no hay ninguna ganada con cierre', () => {
    expect(calcularCicloDeVenta([])).toBeNull()
    expect(
      calcularCicloDeVenta([
        { etapa: 'demo', fechaCreacion: new Date(2026, 0, 1), fechaCierreReal: null },
      ]),
    ).toBeNull()
  })

  it('con una sola ganada devuelve sus dias', () => {
    expect(calcularCicloDeVenta([oportunidades[0]!])).toBe(60)
  })
})

describe('calcularForecast', () => {
  const hoy = new Date(2026, 7, 25) // 25/08/2026

  it('incluye la oportunidad que cierra hoy, aunque "hoy" venga con hora', () => {
    // El bug que este test cubre: comparando timestamps crudos, una oportunidad
    // que cierra hoy a las 00:00 queda afuera de su propia ventana en cuanto
    // `hoy` trae hora, que es lo que pasa con `new Date()` en produccion.
    const cierraHoy: readonly OportunidadConCierreEstimado[] = [
      {
        montoArsCentavos: 100_000_000,
        etapa: 'demo', // 0,30 -> 30.000.000
        fechaCierreEstimada: new Date(2026, 7, 25),
      },
    ]

    const hoyConHora = new Date(2026, 7, 25, 14, 30)
    expect(calcularForecast(cierraHoy, hoyConHora, 3)).toBe(30_000_000)
    expect(calcularForecast(cierraHoy, hoy, 3)).toBe(30_000_000)
  })

  it('incluye la que cierra el ultimo dia de la ventana, con hoy con hora', () => {
    const cierraAlLimite: readonly OportunidadConCierreEstimado[] = [
      {
        montoArsCentavos: 200_000_000,
        etapa: 'propuesta', // 0,50 -> 100.000.000
        fechaCierreEstimada: new Date(2026, 10, 25), // 25/11/2026 = hoy + 3 meses
      },
    ]

    expect(calcularForecast(cierraAlLimite, new Date(2026, 7, 25, 23, 59), 3)).toBe(100_000_000)
  })

  const oportunidades: readonly OportunidadConCierreEstimado[] = [
    {
      montoArsCentavos: 100_000_000,
      etapa: 'demo',
      fechaCierreEstimada: new Date(2026, 8, 30), // 30/09/2026, dentro de 3 meses
    },
    {
      montoArsCentavos: 200_000_000,
      etapa: 'propuesta',
      fechaCierreEstimada: new Date(2026, 10, 15), // 15/11/2026, dentro de 3 meses
    },
    {
      montoArsCentavos: 150_000_000,
      etapa: 'negociacion',
      fechaCierreEstimada: new Date(2027, 0, 10), // 10/01/2027, solo dentro de 6 meses
    },
    {
      montoArsCentavos: 500_000_000,
      etapa: 'ganada',
      fechaCierreEstimada: new Date(2026, 8, 1), // cerrada, siempre excluida
    },
  ]

  it('forecast a 3 meses', () => {
    // ventana 25/08/2026 - 25/11/2026
    // 1.000.000 x 0,30 =   300.000
    // 2.000.000 x 0,50 = 1.000.000
    // total = 1.300.000 -> 130.000.000 centavos
    expect(calcularForecast(oportunidades, hoy, 3)).toBe(130_000_000)
  })

  it('forecast a 6 meses suma la que cierra en enero', () => {
    // 300.000 + 1.000.000 + 1.500.000 x 0,75 = 300.000 + 1.000.000 + 1.125.000
    // total = 2.425.000 -> 242.500.000 centavos
    expect(calcularForecast(oportunidades, hoy, 6)).toBe(242_500_000)
  })

  it('deja afuera lo que ya vencio de estimacion', () => {
    const vieja: readonly OportunidadConCierreEstimado[] = [
      {
        montoArsCentavos: 100_000_000,
        etapa: 'demo',
        fechaCierreEstimada: new Date(2026, 6, 1), // 01/07/2026, antes de hoy
      },
    ]
    expect(calcularForecast(vieja, hoy, 3)).toBe(0)
  })

  it('sin oportunidades da 0', () => {
    expect(calcularForecast([], hoy, 3)).toBe(0)
  })
})
