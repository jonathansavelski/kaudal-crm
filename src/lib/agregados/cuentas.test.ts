import { describe, expect, it } from 'vitest'

import { armarContextoMacro } from '@/lib/agregados/contexto'
import { armarCuentas, filtrarCuentas, FILTROS_CUENTAS_VACIOS } from '@/lib/agregados/cuentas'
import { sanearFacturas } from '@/lib/agregados/facturas'
import type { FilaContrato, FilaEmpresa, FilaFactura, FilaIpc, FilaMep } from '@/lib/api/consultas'

const IPC: FilaIpc[] = [
  { periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 },
  { periodo: '2026-07-01', indice: 200, variacion_mensual: 0.03 },
]

const CONTEXTO = armarContextoMacro(IPC, [
  { fecha: '2026-01-01', venta_centavos: 100_000 },
] satisfies FilaMep[])

const HOY = new Date('2026-08-25T00:00:00')

function empresa(parcial: Partial<FilaEmpresa> = {}): FilaEmpresa {
  return {
    id: 'e1',
    razon_social: 'Logística Andina SRL',
    cuit: '30111111118',
    sector: 'transporte_y_logistica',
    tamanio: 'pyme',
    estado_comercial: 'cliente',
    moneda_contrato: 'ARS',
    fecha_alta: '2024-08-25',
    owner_comercial: 'Ana Ruiz',
    ciudad: 'Mendoza',
    provincia: 'Mendoza',
    ...parcial,
  }
}

function factura(parcial: Partial<FilaFactura> = {}): FilaFactura {
  return {
    factura_id: 'f1',
    empresa_id: 'e1',
    contrato_id: 'c1',
    oportunidad_id: null,
    numero: 'A-0001-00000001',
    fecha_emision: '2026-07-01',
    fecha_vencimiento: '2026-07-31',
    monto_centavos: 1_000_000,
    moneda: 'ARS',
    estado_vigente: 'vencida',
    cobrado_centavos: 0,
    saldo_centavos: 1_000_000,
    cantidad_cobros: 0,
    fecha_ultimo_cobro: null,
    dias_mora: 25,
    dias_mora_al_cobro: null,
    ...parcial,
  }
}

const CONTRATOS: FilaContrato[] = [
  {
    id: 'c1',
    empresa_id: 'e1',
    abono_mensual_centavos: 800_000,
    moneda: 'ARS',
    estado: 'activo',
    fecha_inicio: '2025-01-01',
    fecha_fin: null,
    motivo_baja: null,
  },
]

describe('armarCuentas', () => {
  const { facturas } = sanearFacturas([factura()], CONTEXTO)

  const cuentas = armarCuentas(
    { empresas: [empresa()], contratos: CONTRATOS, oportunidades: [] },
    facturas,
    CONTEXTO,
    HOY,
  )

  it('acumula facturacion nominal y real de los ultimos 12 meses', () => {
    // Nominal: 1.000.000 centavos emitidos en jul-2026.
    // Real a pesos del mes base (jul-2026, indice 200): 1.000.000 x 200 / 200 = 1.000.000.
    expect(cuentas[0]?.facturacion12mCentavos).toBe(1_000_000)
    expect(cuentas[0]?.facturacion12mRealCentavos).toBe(1_000_000)
  })

  it('deja el saldo pendiente y la mora de la unica factura', () => {
    expect(cuentas[0]?.saldoCentavos).toBe(1_000_000)
    expect(cuentas[0]?.moraPromedioDias).toBe(25)
    expect(cuentas[0]?.pctFueraDeTermino).toBe(1)
  })

  it('resuelve el abono del contrato activo y la antiguedad en meses', () => {
    expect(cuentas[0]?.abonoMensualCentavos).toBe(800_000)
    expect(cuentas[0]?.estadoContrato).toBe('activo')
    // Alta 25/08/2024, hoy 25/08/2026: 24 meses calendario completos.
    expect(cuentas[0]?.mesesAntiguedad).toBe(24)
  })

  it('una cuenta sin facturas no rompe: cero es un dato, no un hueco', () => {
    const sinFacturas = armarCuentas(
      {
        empresas: [empresa({ id: 'e2', razon_social: 'Prospecto SA', estado_comercial: 'prospecto' })],
        contratos: [],
        oportunidades: [],
      },
      [],
      CONTEXTO,
      HOY,
    )

    expect(sinFacturas[0]?.facturacion12mCentavos).toBe(0)
    expect(sinFacturas[0]?.saldoCentavos).toBe(0)
    expect(sinFacturas[0]?.abonoMensualCentavos).toBeNull()
    expect(Number.isFinite(sinFacturas[0]?.score)).toBe(true)
  })
})

describe('filtrarCuentas', () => {
  const { facturas } = sanearFacturas([factura()], CONTEXTO)
  const cuentas = armarCuentas(
    {
      empresas: [empresa(), empresa({ id: 'e2', razon_social: 'Agro Norte SA', sector: 'agro', provincia: 'Salta' })],
      contratos: CONTRATOS,
      oportunidades: [],
    },
    facturas,
    CONTEXTO,
    HOY,
  )

  it('sin filtros devuelve todo', () => {
    expect(filtrarCuentas(cuentas, FILTROS_CUENTAS_VACIOS)).toHaveLength(2)
  })

  it('filtra por sector y por provincia', () => {
    expect(filtrarCuentas(cuentas, { ...FILTROS_CUENTAS_VACIOS, sector: 'agro' })).toHaveLength(1)
    expect(
      filtrarCuentas(cuentas, { ...FILTROS_CUENTAS_VACIOS, provincia: 'Mendoza' }),
    ).toHaveLength(1)
  })

  it('el rango de facturacion se escribe en pesos y compara en centavos', () => {
    // 1.000.000 centavos = $ 10.000. Una cota de 20.000 pesos deja afuera a las dos.
    expect(
      filtrarCuentas(cuentas, { ...FILTROS_CUENTAS_VACIOS, factMin: '20000' }),
    ).toHaveLength(0)
    expect(filtrarCuentas(cuentas, { ...FILTROS_CUENTAS_VACIOS, factMin: '10000' })).toHaveLength(1)
  })

  it('la busqueda ignora acentos', () => {
    expect(
      filtrarCuentas(cuentas, { ...FILTROS_CUENTAS_VACIOS, busqueda: 'logistica' }),
    ).toHaveLength(1)
  })
})
