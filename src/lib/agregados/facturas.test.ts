import { describe, expect, it } from 'vitest'

import { armarContextoMacro } from '@/lib/agregados/contexto'
import {
  calcularDsoDeCartera,
  calcularSaldoCartera,
  facturacionUltimos12Meses,
  indexarCobros,
  sanearFacturas,
} from '@/lib/agregados/facturas'
import type { FilaCobro, FilaFactura, FilaIpc, FilaMep } from '@/lib/api/consultas'

const IPC: FilaIpc[] = [
  { periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 },
  { periodo: '2026-07-01', indice: 200, variacion_mensual: 0.03 },
]

const MEP: FilaMep[] = [{ fecha: '2026-01-02', venta_centavos: 100_000 }]

const CONTEXTO = armarContextoMacro(IPC, MEP)

function factura(parcial: Partial<FilaFactura> = {}): FilaFactura {
  return {
    factura_id: 'f1',
    empresa_id: 'e1',
    fecha_emision: '2026-01-10',
    fecha_vencimiento: '2026-02-10',
    monto_centavos: 1_000_000,
    moneda: 'ARS',
    estado_vigente: 'pendiente',
    saldo_centavos: 1_000_000,
    dias_mora: 0,
    dias_mora_al_cobro: null,
    ...parcial,
  }
}

describe('sanearFacturas', () => {
  it('normaliza el importe en USD al MEP de la fecha de emision', () => {
    // USD 100 = 10.000 centavos x 100.000 centavos de MEP / 100 = 10.000.000 centavos ARS
    const { facturas } = sanearFacturas(
      [factura({ moneda: 'USD', monto_centavos: 10_000, saldo_centavos: 10_000 })],
      CONTEXTO,
    )

    expect(facturas[0]?.montoArsCentavos).toBe(10_000_000)
    expect(facturas[0]?.esUsd).toBe(true)
  })

  it('cuenta aparte las facturas sin cotizacion en vez de valuarlas en cero', () => {
    const { facturas, sinCotizacion } = sanearFacturas(
      [factura({ moneda: 'USD', fecha_emision: '2025-12-01' })],
      CONTEXTO,
    )

    expect(facturas).toHaveLength(0)
    expect(sinCotizacion).toBe(1)
  })

  it('descarta filas incompletas de la vista sin romper', () => {
    const { facturas } = sanearFacturas([factura({ factura_id: null })], CONTEXTO)
    expect(facturas).toHaveLength(0)
  })

  it('reexpresa el saldo a pesos del mes base: 1.000.000 x 200 / 100 = 2.000.000', () => {
    const { facturas } = sanearFacturas([factura()], CONTEXTO)
    expect(facturas[0]?.saldoRealCentavos).toBe(2_000_000)
  })
})

describe('calcularSaldoCartera', () => {
  it('separa la porcion en pesos de la porcion en dolares normalizada', () => {
    const { facturas } = sanearFacturas(
      [
        factura({ factura_id: 'a' }),
        factura({
          factura_id: 'b',
          moneda: 'USD',
          monto_centavos: 10_000,
          saldo_centavos: 10_000,
        }),
      ],
      CONTEXTO,
    )
    const saldo = calcularSaldoCartera(facturas)

    // 1.000.000 en ARS + USD 100 llevados a 10.000.000 = 11.000.000 nominales
    expect(saldo.nominalCentavos).toBe(11_000_000)
    expect(saldo.saldoArsCentavos).toBe(1_000_000)
    expect(saldo.saldoUsdNormalizadoCentavos).toBe(10_000_000)
    // Ambos saldos se duplican al pasar a pesos del mes base (indice 100 -> 200).
    expect(saldo.realCentavos).toBe(22_000_000)
  })

  it('una cartera vacia da cero, no NaN', () => {
    expect(calcularSaldoCartera([])).toEqual({
      nominalCentavos: 0,
      realCentavos: 0,
      saldoArsCentavos: 0,
      saldoUsdNormalizadoCentavos: 0,
    })
  })
})

describe('calcularDsoDeCartera', () => {
  it('DSO de una factura de 1.000.000 emitida el 10/01, mirada al 15/07', () => {
    // 13 cortes: los cierres de jul-2025 a jun-2026 mas el dia de hoy. La factura solo
    // existe en 7 de ellos (ene a jun 2026 y hoy), y nunca se cobra.
    //   saldo promedio = 7 x 1.000.000 / 13 = 538.461,54 -> 538.462
    //   DSO = 538.462 / 1.000.000 x 365 = 196,54 dias
    const { facturas } = sanearFacturas([factura()], CONTEXTO)
    const resultado = calcularDsoDeCartera(facturas, new Map(), new Date('2026-07-15T00:00:00'))

    expect(resultado.cortes).toBe(13)
    expect(resultado.ventasCentavos).toBe(1_000_000)
    expect(resultado.saldoPromedioCentavos).toBe(538_462)
    expect(resultado.dias).toBeCloseTo(196.54, 2)
  })

  it('un cobro previo al corte baja el saldo de ese corte', () => {
    const { facturas } = sanearFacturas([factura()], CONTEXTO)
    const cobros = new Map([[ 'f1', [{ fecha: '2026-02-01', arsCentavos: 1_000_000 }] ]])
    // Solo el corte de ene-2026 queda con saldo: 1.000.000 / 13 = 76.923
    const resultado = calcularDsoDeCartera(facturas, cobros, new Date('2026-07-15T00:00:00'))

    expect(resultado.saldoPromedioCentavos).toBe(76_923)
  })

  it('sin ventas en el periodo el DSO es null, no cero', () => {
    const { facturas } = sanearFacturas([factura({ fecha_emision: '2026-01-10' })], CONTEXTO)
    const resultado = calcularDsoDeCartera(facturas, new Map(), new Date('2028-01-01T00:00:00'))

    expect(resultado.dias).toBeNull()
  })
})

describe('indexarCobros', () => {
  it('normaliza el cobro con el MEP de la emision de su factura', () => {
    const { facturas } = sanearFacturas(
      [factura({ moneda: 'USD', monto_centavos: 10_000, saldo_centavos: 0 })],
      CONTEXTO,
    )
    const cobros: FilaCobro[] = [
      { factura_id: 'f1', fecha: '2026-03-01', monto_centavos: 10_000, moneda: 'USD' },
    ]

    expect(indexarCobros(cobros, facturas, CONTEXTO).get('f1')).toEqual([
      { fecha: '2026-03-01', arsCentavos: 10_000_000 },
    ])
  })
})

describe('facturacionUltimos12Meses', () => {
  it('deja afuera lo emitido hace mas de un año', () => {
    const { facturas } = sanearFacturas(
      [factura({ factura_id: 'a', fecha_emision: '2026-01-10' })],
      CONTEXTO,
    )

    expect(facturacionUltimos12Meses(facturas, new Date('2026-07-01T00:00:00')).get('e1')).toBe(
      1_000_000,
    )
    expect(facturacionUltimos12Meses(facturas, new Date('2028-01-01T00:00:00')).size).toBe(0)
  })
})
