import { describe, expect, it } from 'vitest'

import { aArs, aArsHoy, armarContextoMacro } from '@/lib/agregados/contexto'
import type { FilaIpc, FilaMep } from '@/lib/api/consultas'

const IPC: FilaIpc[] = [
  { periodo: '2026-05-01', indice: 100, variacion_mensual: 0.02 },
  { periodo: '2026-06-01', indice: 104, variacion_mensual: 0.04 },
  { periodo: '2026-07-01', indice: 130, variacion_mensual: 0.25 },
]

const MEP: FilaMep[] = [
  { fecha: '2026-05-04', venta_centavos: 100_000 },
  { fecha: '2026-06-10', venta_centavos: 150_000 },
]

describe('armarContextoMacro', () => {
  const contexto = armarContextoMacro(IPC, MEP)

  it('el mes base es el ultimo IPC publicado', () => {
    expect(contexto.mesBase.getFullYear()).toBe(2026)
    expect(contexto.mesBase.getMonth()).toBe(6) // julio
    expect(contexto.indiceBase).toBe(130)
  })

  it('inflacion acumulada de la ventana: 130 / 100 - 1 = 0,30', () => {
    expect(contexto.inflacionAcumulada).toBeCloseTo(0.3, 10)
  })

  it('un dia sin cotizacion toma la ultima hacia atras', () => {
    // El 20/06 no hay dato: manda el del 10/06.
    expect(contexto.mepVentaDeFecha('2026-06-20')).toBe(150_000)
    expect(contexto.mepVentaDeFecha('2026-06-10')).toBe(150_000)
    expect(contexto.mepVentaDeFecha('2026-06-09')).toBe(100_000)
  })

  it('agosto todavia no tiene IPC: vale el ultimo publicado', () => {
    expect(contexto.indiceDeFecha('2026-08-18')).toBe(130)
  })

  it('antes del comienzo de la serie devuelve null, no cero', () => {
    expect(contexto.mepVentaDeFecha('2026-05-03')).toBeNull()
    expect(contexto.indiceDeFecha('2026-04-30')).toBeNull()
  })
})

describe('aArs', () => {
  const contexto = armarContextoMacro(IPC, MEP)

  it('un importe en ARS pasa sin tocar', () => {
    expect(aArs(contexto, 123_456, 'ARS', '2026-06-15')).toBe(123_456)
  })

  it('USD 1.000 al MEP de 1.500 pesos son 1.500.000 pesos', () => {
    // 100.000 centavos de USD x 150.000 centavos de MEP / 100 = 150.000.000 centavos
    expect(aArs(contexto, 100_000, 'USD', '2026-06-15')).toBe(150_000_000)
  })

  it('sin cotizacion para la fecha devuelve null, no cero', () => {
    expect(aArs(contexto, 100_000, 'USD', '2026-01-01')).toBeNull()
  })

  it('aArsHoy usa el ultimo MEP salvo que le pisen la cotizacion', () => {
    expect(aArsHoy(contexto, 100_000, 'USD')).toBe(150_000_000)
    expect(aArsHoy(contexto, 100_000, 'USD', 300_000)).toBe(300_000_000)
  })
})
