import { describe, expect, it } from 'vitest'

import { armarCobranzas, filtrarCobranzas, FILTROS_COBRANZAS_VACIOS } from '@/lib/agregados/cobranzas'
import { armarContextoMacro } from '@/lib/agregados/contexto'
import { sanearFacturas } from '@/lib/agregados/facturas'
import type { FilaEmpresa, FilaFactura, FilaIpc, FilaMep } from '@/lib/api/consultas'

const CONTEXTO = armarContextoMacro(
  [
    { periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 },
    { periodo: '2026-07-01', indice: 200, variacion_mensual: 0.03 },
  ] satisfies FilaIpc[],
  [{ fecha: '2026-01-01', venta_centavos: 100_000 }] satisfies FilaMep[],
)

const HOY = new Date('2026-08-25T00:00:00')

const EMPRESAS: FilaEmpresa[] = [
  {
    id: 'e1',
    razon_social: 'Logística Andina SRL',
    cuit: '30111111118',
    sector: 'transporte_y_logistica',
    tamanio: 'pyme',
    estado_comercial: 'cliente',
    moneda_contrato: 'ARS',
    fecha_alta: '2024-01-01',
    owner_comercial: 'Ana Ruiz',
    ciudad: 'Mendoza',
    provincia: 'Mendoza',
  },
]

function factura(parcial: Partial<FilaFactura> = {}): FilaFactura {
  return {
    factura_id: 'f1',
    empresa_id: 'e1',
    contrato_id: 'c1',
    oportunidad_id: null,
    numero: 'A-0001-00000001',
    fecha_emision: '2026-01-10',
    fecha_vencimiento: '2026-02-10',
    monto_centavos: 1_000_000,
    moneda: 'ARS',
    estado_vigente: 'vencida',
    cobrado_centavos: 0,
    saldo_centavos: 1_000_000,
    cantidad_cobros: 0,
    fecha_ultimo_cobro: null,
    dias_mora: 196,
    dias_mora_al_cobro: null,
    ...parcial,
  }
}

/** Vencida hace más de 90 días pero ya cobrada: no es cartera. */
const PAGADA_VIEJA = factura({
  factura_id: 'f2',
  numero: 'A-0001-00000002',
  estado_vigente: 'pagada',
  cobrado_centavos: 1_000_000,
  saldo_centavos: 0,
  cantidad_cobros: 1,
  fecha_ultimo_cobro: '2026-03-01',
  dias_mora: 0,
  dias_mora_al_cobro: 19,
})

function armar(filasCrudas: FilaFactura[], tnaAnual = 0.3) {
  const { facturas } = sanearFacturas(filasCrudas, CONTEXTO)
  return armarCobranzas(facturas, new Map(), EMPRESAS, CONTEXTO, tnaAnual, HOY)
}

describe('armarCobranzas', () => {
  it('el saldo nominal solo suma las facturas con saldo abierto', () => {
    const datos = armar([factura(), PAGADA_VIEJA])

    expect(datos.saldoNominalCentavos).toBe(1_000_000)
    // Emitida en ene-2026 (índice 100) y reexpresada a jul-2026 (índice 200):
    // 1.000.000 x 200 / 100 = 2.000.000 centavos de pesos del mes base.
    expect(datos.saldoRealCentavos).toBe(2_000_000)
  })

  it('el aging deja fuera la factura ya cobrada aunque haya vencido hace meses', () => {
    const datos = armar([factura(), PAGADA_VIEJA])
    const masDe90 = datos.aging.find((porcion) => porcion.bucket === '+90')

    expect(masDe90?.cantidad).toBe(1)
    expect(masDe90?.saldoCentavos).toBe(1_000_000)
  })

  it('el VAN descuenta el saldo y por eso queda por debajo del nominal', () => {
    const datos = armar([factura()])

    expect(datos.vanCentavos).toBeLessThan(datos.saldoNominalCentavos)
    expect(datos.costoDeEsperaCentavos).toBe(datos.vanCentavos - datos.saldoNominalCentavos)
    // TEA de una TNA del 30% con capitalización mensual: (1 + 0,30/12)^12 - 1 = 0,3449...
    expect(datos.teaAplicada).toBeCloseTo(0.344889, 5)
  })

  it('sin cartera abierta el ECL sobre saldo es null, no NaN', () => {
    const datos = armar([PAGADA_VIEJA])

    expect(datos.saldoNominalCentavos).toBe(0)
    expect(datos.eclSobreSaldo).toBeNull()
  })
})

describe('filtrarCobranzas', () => {
  const datos = armar([factura(), PAGADA_VIEJA])

  it('sin filtros muestra todas las facturas, cobradas incluidas', () => {
    expect(filtrarCobranzas(datos.filas, FILTROS_COBRANZAS_VACIOS)).toHaveLength(2)
  })

  it('el drill-down por bucket cuadra con la barra del gráfico', () => {
    // La pagada vieja también cae en "+90" por fecha, pero no es cartera: el filtro por
    // bucket la excluye igual que `calcularAging`.
    const enBucket = filtrarCobranzas(datos.filas, { ...FILTROS_COBRANZAS_VACIOS, bucket: '+90' })
    const masDe90 = datos.aging.find((porcion) => porcion.bucket === '+90')

    expect(enBucket).toHaveLength(1)
    expect(enBucket).toHaveLength(masDe90?.cantidad ?? -1)
  })

  it('filtra por estado vigente y por texto libre', () => {
    expect(
      filtrarCobranzas(datos.filas, { ...FILTROS_COBRANZAS_VACIOS, estado: 'pagada' }),
    ).toHaveLength(1)
    expect(
      filtrarCobranzas(datos.filas, { ...FILTROS_COBRANZAS_VACIOS, busqueda: '00000002' }),
    ).toHaveLength(1)
  })

  it('solo pendientes deja fuera las saldadas', () => {
    expect(
      filtrarCobranzas(datos.filas, { ...FILTROS_COBRANZAS_VACIOS, soloPendientes: '1' }),
    ).toHaveLength(1)
  })
})
