import { describe, expect, it } from 'vitest'

import { armarCanales, calcularChurnPromedio } from '@/lib/agregados/canales'
import { armarContextoMacro } from '@/lib/agregados/contexto'
import type {
  FilaAccion,
  FilaCampania,
  FilaContrato,
  FilaIpc,
  FilaMep,
  FilaOportunidad,
} from '@/lib/api/consultas'

const CONTEXTO = armarContextoMacro(
  [{ periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 }] satisfies FilaIpc[],
  [{ fecha: '2026-01-01', venta_centavos: 100_000 }] satisfies FilaMep[],
)

const HOY = new Date('2026-08-25T00:00:00')

const CONTRATOS: FilaContrato[] = [
  {
    id: 'c1',
    empresa_id: 'e1',
    abono_mensual_centavos: 1_000_000,
    moneda: 'ARS',
    estado: 'activo',
    fecha_inicio: '2025-01-01',
    fecha_fin: null,
  },
  {
    id: 'c2',
    empresa_id: 'e2',
    abono_mensual_centavos: 500_000,
    moneda: 'ARS',
    estado: 'cancelado',
    fecha_inicio: '2025-01-01',
    fecha_fin: '2026-03-15',
  },
]

const OPORTUNIDADES: FilaOportunidad[] = [
  {
    id: 'o1',
    empresa_id: 'e1',
    titulo: 'Alta',
    monto_centavos: 10_000_000,
    moneda: 'ARS',
    etapa: 'ganada',
    origen: 'referidos',
    tipo: 'implementacion',
    fecha_creacion: '2024-12-01',
    fecha_cierre_estimada: '2025-01-01',
    fecha_cierre_real: '2025-01-01',
  },
  {
    id: 'o2',
    empresa_id: 'e2',
    titulo: 'Alta',
    monto_centavos: 5_000_000,
    moneda: 'ARS',
    etapa: 'ganada',
    origen: 'eventos',
    tipo: 'implementacion',
    fecha_creacion: '2024-12-05',
    fecha_cierre_estimada: '2025-01-05',
    fecha_cierre_real: '2025-01-05',
  },
]

const CAMPANIAS: FilaCampania[] = [
  {
    id: 'k1',
    nombre: 'Referidos Q1',
    canal: 'referidos',
    presupuesto_centavos: 1_000_000,
    moneda: 'ARS',
    fecha_inicio: '2025-01-01',
    fecha_fin: '2025-03-31',
  },
]

function accion(parcial: Partial<FilaAccion> = {}): FilaAccion {
  return {
    id: 'a1',
    empresa_id: 'e1',
    campania_id: null,
    oportunidad_id: null,
    fecha: '2025-02-01',
    costo_centavos: 100_000,
    moneda: 'ARS',
    ...parcial,
  }
}

describe('calcularChurnPromedio', () => {
  it('una baja en doce meses sobre dos contratos activos: promedio de 0 y 0,5 sobre 12 meses', () => {
    // Solo el mes de marzo 2026 tiene una baja: 1 / 2 = 0,5. Los otros once meses dan 0.
    // Promedio = 0,5 / 12 = 0,041666...
    expect(calcularChurnPromedio(CONTRATOS, HOY)).toBeCloseTo(0.5 / 12, 10)
  })

  it('sin contratos no hay churn que medir: null, no cero', () => {
    expect(calcularChurnPromedio([], HOY)).toBeNull()
  })
})

describe('armarCanales', () => {
  const resultado = armarCanales({
    acciones: [
      accion({ id: 'a1', campania_id: 'k1', costo_centavos: 300_000 }),
      accion({ id: 'a2', oportunidad_id: 'o2', costo_centavos: 200_000 }),
      accion({ id: 'a3' }),
    ],
    campanias: CAMPANIAS,
    oportunidades: OPORTUNIDADES,
    contratos: CONTRATOS,
    contexto: CONTEXTO,
    hoy: HOY,
  })

  function fila(canal: string) {
    return resultado.filas.find((item) => item.canal === canal)
  }

  it('atribuye el costo por campaña y, si no hay, por el origen de la oportunidad', () => {
    expect(fila('referidos')?.costoCentavos).toBe(300_000)
    expect(fila('eventos')?.costoCentavos).toBe(200_000)
  })

  it('las acciones sin campaña ni oportunidad se informan, no se reparten a ojo', () => {
    expect(resultado.accionesSinAtribuir).toBe(1)
  })

  it('CAC de referidos: 300.000 de costo sobre 1 cliente nuevo', () => {
    expect(fila('referidos')?.cacCentavos).toBe(300_000)
    expect(fila('referidos')?.clientesNuevos).toBe(1)
  })

  it('un canal sin clientes nuevos tiene CAC null, no cero', () => {
    expect(fila('linkedin')?.cacCentavos).toBeNull()
    expect(fila('linkedin')?.ltvCentavos).toBeNull()
  })

  it('LTV de referidos: ARPA 1.000.000 x 0,75 / churn 0,0416666', () => {
    // 1.000.000 x 0,75 = 750.000; 750.000 / (0,5/12) = 18.000.000
    expect(fila('referidos')?.ltvCentavos).toBe(18_000_000)
    expect(fila('referidos')?.ratio).toBeCloseTo(60, 6)
  })

  it('eventos perdio su unico cliente: sin contratos activos, no hay ARPA ni LTV', () => {
    expect(fila('eventos')?.ltvCentavos).toBeNull()
  })
})
