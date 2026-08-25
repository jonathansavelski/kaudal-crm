import { describe, expect, it } from 'vitest'

import { armarCampanias, filtrarAcciones, armarAcciones } from '@/lib/agregados/acciones'
import { armarContextoMacro } from '@/lib/agregados/contexto'
import type {
  FilaAccion,
  FilaCampania,
  FilaEmpresa,
  FilaIpc,
  FilaMep,
  FilaOportunidad,
} from '@/lib/api/consultas'

const CONTEXTO = armarContextoMacro(
  [{ periodo: '2026-01-01', indice: 100, variacion_mensual: 0.02 }] satisfies FilaIpc[],
  [{ fecha: '2026-01-01', venta_centavos: 100_000 }] satisfies FilaMep[],
)

const EMPRESAS: FilaEmpresa[] = [
  {
    id: 'e1',
    razon_social: 'Transportes del Sur SA',
    cuit: '30111111118',
    sector: 'transporte_y_logistica',
    tamanio: 'pyme',
    estado_comercial: 'cliente',
    moneda_contrato: 'ARS',
    fecha_alta: '2024-01-01',
    owner_comercial: 'Ana Ruiz',
    ciudad: 'Rosario',
    provincia: 'Santa Fe',
  },
]

const CAMPANIAS: FilaCampania[] = [
  {
    id: 'k1',
    nombre: 'LinkedIn Q1',
    canal: 'linkedin',
    presupuesto_centavos: 10_000_000,
    moneda: 'ARS',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-03-31',
  },
]

function oportunidad(parcial: Partial<FilaOportunidad> = {}): FilaOportunidad {
  return {
    id: 'o1',
    empresa_id: 'e1',
    titulo: 'Implementación WMS',
    monto_centavos: 25_000_000,
    moneda: 'ARS',
    etapa: 'ganada',
    origen: 'linkedin',
    tipo: 'implementacion',
    fecha_creacion: '2026-01-05',
    fecha_cierre_estimada: '2026-02-05',
    fecha_cierre_real: '2026-02-05',
    ...parcial,
  }
}

function accion(parcial: Partial<FilaAccion> = {}): FilaAccion {
  return {
    id: 'a1',
    empresa_id: 'e1',
    contacto_id: null,
    campania_id: 'k1',
    oportunidad_id: 'o1',
    tipo: 'demo',
    fecha: '2026-01-10',
    costo_centavos: 500_000,
    moneda: 'ARS',
    resultado: 'positivo',
    notas: 'Demo con el gerente de operaciones',
    ...parcial,
  }
}

describe('armarCampanias', () => {
  it('ROI de una campania con una oportunidad ganada atribuida', () => {
    // inversion = 10.000.000 centavos de presupuesto
    // retorno   = 25.000.000 centavos de la oportunidad ganada atribuida
    // roi       = (25.000.000 - 10.000.000) / 10.000.000 = 1,5  => +150%
    const filas = armarCampanias(
      { acciones: [accion()], campanias: CAMPANIAS, oportunidades: [oportunidad()] },
      CONTEXTO,
    )

    expect(filas[0]?.roi).toBe(1.5)
    expect(filas[0]?.retornoArsCentavos).toBe(25_000_000)
    expect(filas[0]?.oportunidadesGanadas).toBe(1)
  })

  it('una oportunidad perdida se cuenta como atribuida pero no aporta retorno', () => {
    const filas = armarCampanias(
      {
        acciones: [accion()],
        campanias: CAMPANIAS,
        oportunidades: [oportunidad({ etapa: 'perdida' })],
      },
      CONTEXTO,
    )

    expect(filas[0]?.oportunidadesAtribuidas).toBe(1)
    expect(filas[0]?.oportunidadesGanadas).toBe(0)
    expect(filas[0]?.retornoArsCentavos).toBe(0)
    // (0 - 10.000.000) / 10.000.000 = -1 => la campania perdio toda la inversion.
    expect(filas[0]?.roi).toBe(-1)
  })

  it('no cuenta dos veces la misma oportunidad tocada por dos acciones', () => {
    const filas = armarCampanias(
      {
        acciones: [accion(), accion({ id: 'a2', fecha: '2026-01-20' })],
        campanias: CAMPANIAS,
        oportunidades: [oportunidad()],
      },
      CONTEXTO,
    )

    expect(filas[0]?.acciones).toBe(2)
    expect(filas[0]?.oportunidadesAtribuidas).toBe(1)
    expect(filas[0]?.retornoArsCentavos).toBe(25_000_000)
  })

  it('devuelve null cuando no hay presupuesto contra el cual medir', () => {
    const filas = armarCampanias(
      {
        acciones: [],
        campanias: [{ ...CAMPANIAS[0]!, presupuesto_centavos: 0 }],
        oportunidades: [],
      },
      CONTEXTO,
    )

    expect(filas[0]?.roi).toBeNull()
  })
})

describe('filtrarAcciones', () => {
  const vistas = armarAcciones(
    {
      acciones: [
        accion(),
        accion({ id: 'a2', tipo: 'email', resultado: 'sin_respuesta', fecha: '2026-02-15' }),
      ],
      campanias: CAMPANIAS,
      empresas: EMPRESAS,
      oportunidades: [oportunidad()],
    },
    CONTEXTO,
  )

  it('ordena de la accion mas reciente a la mas vieja', () => {
    expect(vistas.map((vista) => vista.id)).toEqual(['a2', 'a1'])
  })

  it('filtra por tipo y por rango de fechas', () => {
    expect(
      filtrarAcciones(vistas, {
        busqueda: '',
        tipo: 'demo',
        resultado: '',
        campania: '',
        desde: '',
        hasta: '',
      }),
    ).toHaveLength(1)

    expect(
      filtrarAcciones(vistas, {
        busqueda: '',
        tipo: '',
        resultado: '',
        campania: '',
        desde: '2026-02-01',
        hasta: '',
      }),
    ).toHaveLength(1)
  })

  it('la busqueda ignora acentos y mayusculas', () => {
    const encontradas = filtrarAcciones(vistas, {
      busqueda: 'IMPLEMENTACION',
      tipo: '',
      resultado: '',
      campania: '',
      desde: '',
      hasta: '',
    })

    expect(encontradas).toHaveLength(2)
  })
})
