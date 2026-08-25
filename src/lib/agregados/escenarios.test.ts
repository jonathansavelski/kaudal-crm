import { describe, expect, it } from 'vitest'

import { armarContextoMacro } from '@/lib/agregados/contexto'
import { ESCENARIO_BASE, simularEscenario } from '@/lib/agregados/escenarios'
import type { FilaIpc, FilaMep, FilaOportunidad } from '@/lib/api/consultas'

const CONTEXTO = armarContextoMacro(
  [{ periodo: '2026-07-01', indice: 100, variacion_mensual: 0.02 }] satisfies FilaIpc[],
  [{ fecha: '2026-08-17', venta_centavos: 100_000 }] satisfies FilaMep[],
)

const HOY = new Date('2026-08-25T00:00:00')

function oportunidad(parcial: Partial<FilaOportunidad> = {}): FilaOportunidad {
  return {
    id: 'o1',
    empresa_id: 'e1',
    titulo: 'Implementación',
    monto_centavos: 100_000_000,
    moneda: 'ARS',
    etapa: 'negociacion',
    origen: 'referidos',
    tipo: 'implementacion',
    fecha_creacion: '2026-06-01',
    fecha_cierre_estimada: '2026-10-01',
    fecha_cierre_real: null,
    ...parcial,
  }
}

const ENTRADA = {
  saldoArsCentavos: 80_000_000,
  saldoUsdNormalizadoCentavos: 20_000_000,
  oportunidades: [oportunidad()],
  contexto: CONTEXTO,
  hoy: HOY,
  diasHastaCobro: 90,
}

describe('simularEscenario', () => {
  it('el escenario base no toca nada: real igual a nominal', () => {
    const base = simularEscenario(ENTRADA, ESCENARIO_BASE)

    expect(base.carteraNominalCentavos).toBe(100_000_000)
    expect(base.carteraRealCentavos).toBe(100_000_000)
    expect(base.perdidaRealCentavos).toBe(0)
    expect(base.caidaPorMep).toBe(0)
  })

  it('exposicion cambiaria base: 80.000.000 / 100.000.000 = 0,80', () => {
    expect(simularEscenario(ENTRADA, ESCENARIO_BASE).exposicionArs).toBeCloseTo(0.8, 10)
  })

  it('un salto del MEP de 50% revalua la porcion en dolares', () => {
    // ARS 80.000.000 + USD normalizados 20.000.000 x 1,5 = 30.000.000 => 110.000.000
    const simulado = simularEscenario(ENTRADA, { saltoMep: 0.5, inflacionMensual: 0 })

    expect(simulado.carteraNominalCentavos).toBe(110_000_000)
    expect(simulado.mepSimuladoCentavos).toBe(150_000)
    // La porcion en pesos pierde 0,5 / 1,5 = 33,33% de su valor en dolares.
    expect(simulado.caidaPorMep).toBeCloseTo(1 / 3, 10)
    // Y su peso relativo cae: 80 / 110 = 0,7272...
    expect(simulado.exposicionArs).toBeCloseTo(80 / 110, 10)
  })

  it('con 10% mensual y 3 meses de espera la cartera vale 100 / 1,1^3', () => {
    const simulado = simularEscenario(ENTRADA, { saltoMep: 0, inflacionMensual: 0.1 })

    // 100.000.000 / 1,331 = 75.131.480,09... redondeado a 75.131.480
    expect(simulado.mesesHastaCobro).toBe(3)
    expect(simulado.carteraRealCentavos).toBe(75_131_480)
    expect(simulado.perdidaRealCentavos).toBe(100_000_000 - 75_131_480)
  })

  it('forecast a 3 meses: 100.000.000 en negociacion x 0,75 = 75.000.000 nominal', () => {
    const base = simularEscenario(ENTRADA, ESCENARIO_BASE)

    expect(base.forecastNominalCentavos[3]).toBe(75_000_000)
    expect(base.forecastRealCentavos[3]).toBe(75_000_000)
  })

  it('una oportunidad en USD se revalua con el salto del MEP', () => {
    const entrada = {
      ...ENTRADA,
      oportunidades: [oportunidad({ moneda: 'USD', monto_centavos: 100_000 })],
    }
    // USD 1.000 al MEP de 1.000 = 100.000.000 centavos; con +50% = 150.000.000.
    // Ponderado por negociacion (0,75) = 112.500.000.
    const simulado = simularEscenario(entrada, { saltoMep: 0.5, inflacionMensual: 0 })

    expect(simulado.forecastNominalCentavos[3]).toBe(112_500_000)
  })
})
