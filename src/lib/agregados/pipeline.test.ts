import { describe, expect, it } from 'vitest'

import { armarContextoMacro } from '@/lib/agregados/contexto'
import { armarPipeline, FILTROS_PIPELINE_VACIOS } from '@/lib/agregados/pipeline'
import type { FilaEmpresa, FilaIpc, FilaMep, FilaOportunidad } from '@/lib/api/consultas'

const CONTEXTO = armarContextoMacro(
  [{ periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 }] satisfies FilaIpc[],
  [{ fecha: '2026-08-01', venta_centavos: 150_000 }] satisfies FilaMep[],
)

const HOY = new Date('2026-08-25T00:00:00')

const EMPRESAS: FilaEmpresa[] = [
  {
    id: 'e1',
    razon_social: 'Distribuidora Central SA',
    cuit: '30111111118',
    sector: 'distribucion_mayorista',
    tamanio: 'corporativa',
    estado_comercial: 'potencial',
    moneda_contrato: 'ARS',
    fecha_alta: '2025-01-01',
    owner_comercial: 'Ana Ruiz',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
  },
  {
    id: 'e2',
    razon_social: 'Frío Patagónico SRL',
    cuit: '30222222226',
    sector: 'alimentos_y_bebidas',
    tamanio: 'pyme',
    estado_comercial: 'prospecto',
    moneda_contrato: 'USD',
    fecha_alta: '2025-06-01',
    owner_comercial: 'Bruno Sosa',
    ciudad: 'Neuquén',
    provincia: 'Neuquén',
  },
]

function oportunidad(parcial: Partial<FilaOportunidad> = {}): FilaOportunidad {
  return {
    id: 'o1',
    empresa_id: 'e1',
    titulo: 'Implementación TMS',
    monto_centavos: 100_000_00,
    moneda: 'ARS',
    etapa: 'demo',
    origen: 'linkedin',
    tipo: 'implementacion',
    fecha_creacion: '2026-06-01',
    fecha_cierre_estimada: '2026-09-30',
    fecha_cierre_real: null,
    ...parcial,
  }
}

describe('armarPipeline', () => {
  it('pondera cada etapa con su probabilidad canonica', () => {
    // demo (0,30) sobre 10.000.000 centavos = 3.000.000
    // propuesta (0,50) sobre 20.000.000 centavos = 10.000.000
    // total ponderado = 13.000.000 centavos
    const datos = armarPipeline(
      {
        oportunidades: [
          oportunidad(),
          oportunidad({ id: 'o2', etapa: 'propuesta', monto_centavos: 200_000_00 }),
        ],
        empresas: EMPRESAS,
      },
      CONTEXTO,
      FILTROS_PIPELINE_VACIOS,
      HOY,
    )

    expect(datos.totalCentavos).toBe(30_000_000)
    expect(datos.totalPonderadoCentavos).toBe(13_000_000)
    expect(datos.cantidad).toBe(2)
  })

  it('deja afuera las cerradas: el pipeline mide lo que falta cerrar', () => {
    const datos = armarPipeline(
      {
        oportunidades: [
          oportunidad(),
          oportunidad({ id: 'o2', etapa: 'ganada', fecha_cierre_real: '2026-07-01' }),
          oportunidad({ id: 'o3', etapa: 'perdida', fecha_cierre_real: '2026-07-01' }),
        ],
        empresas: EMPRESAS,
      },
      CONTEXTO,
      FILTROS_PIPELINE_VACIOS,
      HOY,
    )

    expect(datos.cantidadSinFiltrar).toBe(1)
  })

  it('normaliza el monto en USD al ultimo MEP conocido', () => {
    // USD 100 = 10.000 centavos x 150.000 centavos de MEP / 100 = 15.000.000 centavos ARS
    const datos = armarPipeline(
      {
        oportunidades: [oportunidad({ moneda: 'USD', monto_centavos: 10_000 })],
        empresas: EMPRESAS,
      },
      CONTEXTO,
      FILTROS_PIPELINE_VACIOS,
      HOY,
    )

    expect(datos.totalCentavos).toBe(15_000_000)
  })

  it('el forecast a 3 meses toma solo lo que cierra en la ventana', () => {
    // Cierra el 30/09/2026, adentro de [25/08, 25/11]: entra en los dos forecasts.
    // La segunda cierra el 30/06/2027: no entra en ninguno.
    const datos = armarPipeline(
      {
        oportunidades: [
          oportunidad(),
          oportunidad({ id: 'o2', fecha_cierre_estimada: '2027-06-30' }),
        ],
        empresas: EMPRESAS,
      },
      CONTEXTO,
      FILTROS_PIPELINE_VACIOS,
      HOY,
    )

    // 10.000.000 x 0,30 = 3.000.000
    expect(datos.forecast3Centavos).toBe(3_000_000)
    expect(datos.forecast6Centavos).toBe(3_000_000)
  })

  it('filtra por owner y por rango de monto en pesos', () => {
    const oportunidades = [
      oportunidad(),
      oportunidad({ id: 'o2', empresa_id: 'e2', monto_centavos: 500_000_00 }),
    ]

    const porOwner = armarPipeline(
      { oportunidades, empresas: EMPRESAS },
      CONTEXTO,
      { ...FILTROS_PIPELINE_VACIOS, owner: 'Bruno Sosa' },
      HOY,
    )
    expect(porOwner.cantidad).toBe(1)
    expect(porOwner.cantidadSinFiltrar).toBe(2)

    // 10.000.000 centavos = $ 100.000; la cota mínima de $ 200.000 deja solo la segunda.
    const porMonto = armarPipeline(
      { oportunidades, empresas: EMPRESAS },
      CONTEXTO,
      { ...FILTROS_PIPELINE_VACIOS, montoMin: '200000' },
      HOY,
    )
    expect(porMonto.cantidad).toBe(1)
  })

  it('sin oportunidades abiertas devuelve columnas en cero, no columnas ausentes', () => {
    const datos = armarPipeline(
      { oportunidades: [], empresas: EMPRESAS },
      CONTEXTO,
      FILTROS_PIPELINE_VACIOS,
      HOY,
    )

    expect(datos.columnas).toHaveLength(5)
    expect(datos.columnas.every((columna) => columna.totalCentavos === 0)).toBe(true)
    expect(datos.totalPonderadoCentavos).toBe(0)
  })
})
