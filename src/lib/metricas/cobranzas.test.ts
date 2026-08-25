import { describe, expect, it } from 'vitest'

import {
  bucketDeFactura,
  calcularAging,
  calcularDso,
  calcularPerdidaPorInflacion,
  calcularTea,
  calcularVanCartera,
  diasHastaCobroEsperado,
} from '@/lib/metricas/cobranzas'
import type { FacturaConSaldo } from '@/lib/metricas/tipos'

const HOY = new Date(2026, 7, 25) // 25/08/2026

function factura(parcial: Partial<FacturaConSaldo> = {}): FacturaConSaldo {
  return {
    saldoCentavos: 100_000_000,
    fechaVencimiento: new Date(2026, 8, 10),
    estado: 'pendiente',
    ...parcial,
  }
}

describe('bucketDeFactura', () => {
  it('no vencida es corriente, incluido el dia del vencimiento', () => {
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 8, 10) }), HOY)).toBe(
      'corriente',
    )
    // vence hoy -> 0 dias de mora -> todavia corriente
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 7, 25) }), HOY)).toBe(
      'corriente',
    )
  })

  it('respeta los bordes de cada bucket', () => {
    // 24/08/2026 -> 1 dia de mora
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 7, 24) }), HOY)).toBe('1-30')
    // 26/07/2026 -> 30 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 6, 26) }), HOY)).toBe('1-30')
    // 25/07/2026 -> 31 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 6, 25) }), HOY)).toBe('31-60')
    // 26/06/2026 -> 60 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 5, 26) }), HOY)).toBe('31-60')
    // 25/06/2026 -> 61 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 5, 25) }), HOY)).toBe('61-90')
    // 27/05/2026 -> 90 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 4, 27) }), HOY)).toBe('61-90')
    // 26/05/2026 -> 91 dias
    expect(bucketDeFactura(factura({ fechaVencimiento: new Date(2026, 4, 26) }), HOY)).toBe('+90')
  })

  it('incobrable es excluyente: no cae en +90 aunque tenga 200 dias de mora', () => {
    const incobrable = factura({
      fechaVencimiento: new Date(2026, 0, 10),
      estado: 'incobrable',
    })
    expect(bucketDeFactura(incobrable, HOY)).toBe('incobrable')
  })
})

describe('calcularAging', () => {
  const facturas: readonly FacturaConSaldo[] = [
    // corriente: $10.000.000
    factura({ saldoCentavos: 1_000_000_000, fechaVencimiento: new Date(2026, 8, 10) }),
    // 1-30: $5.000.000 (15 dias de mora)
    factura({ saldoCentavos: 500_000_000, fechaVencimiento: new Date(2026, 7, 10) }),
    // 31-60: $2.000.000 (46 dias)
    factura({ saldoCentavos: 200_000_000, fechaVencimiento: new Date(2026, 6, 10) }),
    // 61-90: $1.000.000 (76 dias)
    factura({ saldoCentavos: 100_000_000, fechaVencimiento: new Date(2026, 5, 10) }),
    // +90: $1.000.000 (227 dias)
    factura({ saldoCentavos: 100_000_000, fechaVencimiento: new Date(2026, 0, 10) }),
    // incobrable: $500.000
    factura({
      saldoCentavos: 50_000_000,
      fechaVencimiento: new Date(2025, 5, 10),
      estado: 'incobrable',
    }),
    // saldada: no es cartera, no entra a ningun bucket
    factura({ saldoCentavos: 0, estado: 'pagada' }),
  ]

  it('reparte el saldo en los seis buckets', () => {
    const aging = calcularAging(facturas, HOY)

    expect(aging.corriente).toEqual({ saldoCentavos: 1_000_000_000, cantidad: 1 })
    expect(aging['1-30']).toEqual({ saldoCentavos: 500_000_000, cantidad: 1 })
    expect(aging['31-60']).toEqual({ saldoCentavos: 200_000_000, cantidad: 1 })
    expect(aging['61-90']).toEqual({ saldoCentavos: 100_000_000, cantidad: 1 })
    expect(aging['+90']).toEqual({ saldoCentavos: 100_000_000, cantidad: 1 })
    expect(aging.incobrable).toEqual({ saldoCentavos: 50_000_000, cantidad: 1 })
  })

  it('el total de los buckets es exactamente el saldo de la cartera', () => {
    const aging = calcularAging(facturas, HOY)
    const totalBuckets = Object.values(aging).reduce((a, b) => a + b.saldoCentavos, 0)
    const totalCartera = facturas.reduce((a, f) => a + Math.max(0, f.saldoCentavos), 0)

    // 1.950.000.000 centavos = $19.500.000, sin contar dos veces la incobrable
    expect(totalBuckets).toBe(1_950_000_000)
    expect(totalBuckets).toBe(totalCartera)
  })

  it('cartera vacia devuelve los seis buckets en cero, no un objeto vacio', () => {
    const aging = calcularAging([], HOY)
    for (const bucket of Object.values(aging)) {
      expect(bucket).toEqual({ saldoCentavos: 0, cantidad: 0 })
    }
  })
})

describe('calcularDso', () => {
  it('saldo promedio sobre ventas del periodo por los dias', () => {
    // (9.000.000 / 30.000.000) x 90 = 0,30 x 90 = 27 dias
    expect(calcularDso(900_000_000, 3_000_000_000, 90)).toBe(27)
  })

  it('devuelve null si no hubo ventas a credito en el periodo', () => {
    expect(calcularDso(900_000_000, 0, 90)).toBeNull()
  })

  it('sin saldo pendiente el DSO es 0 dias', () => {
    expect(calcularDso(0, 3_000_000_000, 90)).toBe(0)
  })
})

describe('calcularTea', () => {
  it('capitaliza mensualmente: la TEA no es la TNA', () => {
    // (1 + 0,40/12)^12 - 1 = (1,0333333)^12 - 1 ~ 0,482126
    const tea = calcularTea(0.4)
    expect(tea).toBeCloseTo(0.482126, 5)
    expect(tea).toBeGreaterThan(0.4)
  })
})

describe('diasHastaCobroEsperado', () => {
  it('no vencida: dias hasta el vencimiento', () => {
    // 25/08 -> 10/09 = 16 dias
    expect(diasHastaCobroEsperado(factura({ fechaVencimiento: new Date(2026, 8, 10) }), HOY)).toBe(
      16,
    )
  })

  it('vencida con historial: el plazo promedio de mora de la empresa', () => {
    const f = factura({ fechaVencimiento: new Date(2026, 6, 10), moraPromedioEmpresaDias: 45 })
    expect(diasHastaCobroEsperado(f, HOY)).toBe(45)
  })

  it('vencida sin historial: 30 dias', () => {
    const f = factura({ fechaVencimiento: new Date(2026, 6, 10) })
    expect(diasHastaCobroEsperado(f, HOY)).toBe(30)
  })
})

describe('calcularVanCartera', () => {
  it('descuenta una factura de $1.000.000 a 90 dias con TNA 40%', () => {
    // 1. TEA    = (1 + 0,40/12)^12 - 1        ~ 0,4821265
    // 2. factor = (1,4821265)^(90/365)        ~ 1,1018846
    // 3. VAN    = 1.000.000 / 1,1018846       ~ $907.536,09
    // El skill dice ~$907.534 porque redondea TEA y factor a 6 decimales en el medio;
    // por eso este caso va con tolerancia y no con igualdad exacta.
    const facturas: readonly FacturaConSaldo[] = [
      factura({
        saldoCentavos: 100_000_000,
        fechaVencimiento: new Date(2026, 10, 23), // 23/11/2026 = hoy + 90 dias
      }),
    ]

    const van = calcularVanCartera(facturas, 0.4, HOY)

    expect(van).toBeCloseTo(90_753_609, 0)
    expect(van / 100).toBeCloseTo(907_534, -1) // dentro de $5 del numero del skill
  })

  it('el VAN siempre es menor que el nominal cuando falta cobrar', () => {
    const facturas: readonly FacturaConSaldo[] = [
      factura({ saldoCentavos: 100_000_000, fechaVencimiento: new Date(2026, 10, 23) }),
    ]
    expect(calcularVanCartera(facturas, 0.4, HOY)).toBeLessThan(100_000_000)
  })

  it('una factura que vence hoy no se descuenta', () => {
    const facturas: readonly FacturaConSaldo[] = [
      factura({ saldoCentavos: 100_000_000, fechaVencimiento: HOY }),
    ]
    expect(calcularVanCartera(facturas, 0.4, HOY)).toBe(100_000_000)
  })

  it('las incobrables no entran al VAN: su valor esperado lo maneja el ECL', () => {
    const facturas: readonly FacturaConSaldo[] = [
      factura({ saldoCentavos: 100_000_000, fechaVencimiento: HOY }),
      factura({
        saldoCentavos: 900_000_000,
        fechaVencimiento: new Date(2025, 0, 10),
        estado: 'incobrable',
      }),
    ]
    expect(calcularVanCartera(facturas, 0.4, HOY)).toBe(100_000_000)
  })

  it('cartera vacia da 0', () => {
    expect(calcularVanCartera([], 0.4, HOY)).toBe(0)
  })

  it('con TNA 0 el VAN es igual al saldo nominal', () => {
    const facturas: readonly FacturaConSaldo[] = [
      factura({ saldoCentavos: 100_000_000, fechaVencimiento: new Date(2026, 10, 23) }),
    ]
    expect(calcularVanCartera(facturas, 0, HOY)).toBe(100_000_000)
  })
})

describe('calcularPerdidaPorInflacion', () => {
  it('mide cuanto valia realmente lo que entro, en pesos del mes de emision', () => {
    // valor real = 1.000.000 x 100/125 = $800.000
    // perdida    = 1.000.000 - 800.000 = $200.000 -> 20.000.000 centavos
    expect(calcularPerdidaPorInflacion(100_000_000, 100, 125)).toBe(20_000_000)
  })

  it('sin inflacion entre emision y cobro no hay perdida', () => {
    expect(calcularPerdidaPorInflacion(100_000_000, 125, 125)).toBe(0)
  })

  it('la direccion es ipc_emision / ipc_cobro, al reves que deflactar', () => {
    // Si fuera ipc_cobro/ipc_emision la perdida daria negativa (-250.000).
    expect(calcularPerdidaPorInflacion(100_000_000, 100, 125)).toBeGreaterThan(0)
  })

  it('devuelve null si el IPC de cobro no es positivo', () => {
    expect(calcularPerdidaPorInflacion(100_000_000, 100, 0)).toBeNull()
  })
})
