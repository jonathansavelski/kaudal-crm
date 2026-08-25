import { describe, expect, it } from 'vitest'
import {
  SIN_DATO,
  etiquetaTipoValor,
  formatearAntiguedad,
  formatearCantidad,
  formatearDias,
  formatearFecha,
  formatearHora,
  formatearImporte,
  formatearImporteAbreviado,
  formatearImporteEtiquetado,
  formatearMesAnio,
  formatearMesAnioGuion,
  formatearMomento,
  formatearPorcentaje,
} from '@/lib/formato'

/**
 * `Intl` separa el simbolo de moneda con un espacio duro (U+00A0) para que no se corte
 * el importe al final de una linea. Se normaliza solo aca, para que el esperado del test
 * se lea con un espacio comun.
 */
function texto(valor: string): string {
  return valor.replace(new RegExp(String.fromCharCode(0x00a0), 'g'), ' ')
}

describe('formatearImporte', () => {
  it('sin decimales cuando supera los $100', () => {
    // 1.234.567 centavos = $ 12.345,67 -> redondea a $ 12.346
    expect(texto(formatearImporte(1_234_567))).toBe('$ 12.346')
  })

  it('con decimales cuando el valor es menor a $100', () => {
    expect(texto(formatearImporte(4_550))).toBe('$ 45,50')
  })

  it('cero se muestra como $ 0, nunca como guion', () => {
    expect(texto(formatearImporte(0))).toBe('$ 0')
  })

  it('negativo con signo menos, nunca entre parentesis', () => {
    expect(texto(formatearImporte(-123_400))).toBe('-$ 1.234')
  })

  it('USD se distingue del peso en el simbolo', () => {
    expect(texto(formatearImporte(123_400, 'USD'))).toBe('US$ 1.234')
  })

  it('null devuelve un texto que explica, no NaN ni guion mudo', () => {
    expect(texto(formatearImporte(null))).toBe(SIN_DATO)
    expect(texto(formatearImporte(Number.NaN))).toBe(SIN_DATO)
    expect(texto(formatearImporte(Number.POSITIVE_INFINITY))).toBe(SIN_DATO)
    expect(texto(formatearImporte(null, 'ARS', 'sin cotización MEP'))).toBe('sin cotización MEP')
  })
})

describe('formatearImporteAbreviado', () => {
  it('millones con un decimal', () => {
    // 120.000.000 centavos = $ 1.200.000 = $ 1,2 M
    expect(texto(formatearImporteAbreviado(120_000_000))).toBe('$ 1,2 M')
  })

  it('miles sin decimal cuando la cifra escalada llega a 10', () => {
    // 85.000.000 centavos = $ 850.000 = $ 850 k
    expect(texto(formatearImporteAbreviado(85_000_000))).toBe('$ 850 k')
  })

  it('miles de millones en MM', () => {
    expect(texto(formatearImporteAbreviado(480_000_000_000))).toBe('$ 4,8 MM')
  })

  it('menos de mil pesos va sin sufijo', () => {
    expect(texto(formatearImporteAbreviado(85_000))).toBe('$ 850')
  })

  it('cero y negativo', () => {
    expect(texto(formatearImporteAbreviado(0))).toBe('$ 0')
    expect(texto(formatearImporteAbreviado(-120_000_000))).toBe('-$ 1,2 M')
  })

  it('null no llega al eje como NaN', () => {
    expect(texto(formatearImporteAbreviado(null))).toBe(SIN_DATO)
  })
})

describe('numeros sin moneda', () => {
  it('porcentaje recibe el ratio, no el numero ya multiplicado', () => {
    expect(texto(formatearPorcentaje(0.124))).toBe('12,4%')
    expect(texto(formatearPorcentaje(0))).toBe('0%')
    expect(texto(formatearPorcentaje(-0.035))).toBe('-3,5%')
  })

  it('porcentaje null: la UI muestra el motivo', () => {
    expect(texto(formatearPorcentaje(null, 1, 'churn cero: LTV no definido'))).toBe(
      'churn cero: LTV no definido',
    )
  })

  it('cantidad con separador de miles', () => {
    expect(texto(formatearCantidad(1400))).toBe('1.400')
  })

  it('dias con singular y plural, y cero legitimo', () => {
    expect(texto(formatearDias(43))).toBe('43 días')
    expect(texto(formatearDias(1))).toBe('1 día')
    expect(texto(formatearDias(0))).toBe('0 días')
    expect(texto(formatearDias(null))).toBe(SIN_DATO)
  })
})

describe('fechas', () => {
  it('fecha corta dd/MM/yyyy, leyendo el date de Postgres sin correr un dia', () => {
    expect(texto(formatearFecha('2026-08-25'))).toBe('25/08/2026')
    expect(texto(formatearFecha(new Date(2026, 7, 25)))).toBe('25/08/2026')
  })

  it('mes y anio', () => {
    expect(texto(formatearMesAnio(new Date(2026, 7, 1)))).toBe('ago 2026')
    expect(texto(formatearMesAnioGuion(new Date(2026, 7, 1)))).toBe('ago-2026')
  })

  it('hora y antiguedad relativa, con el ahora recibido por parametro', () => {
    expect(texto(formatearHora(new Date(2026, 7, 25, 14, 35)))).toBe('14:35')
    expect(
      texto(formatearAntiguedad(new Date(2026, 7, 25, 14, 30), new Date(2026, 7, 25, 14, 35))),
    ).toBe('hace 5 minutos')
  })

  it('fecha ausente o invalida no imprime Invalid Date', () => {
    expect(texto(formatearFecha(null))).toBe('sin fecha')
    expect(texto(formatearFecha('no es una fecha'))).toBe('sin fecha')
  })
})

describe('etiquetas de tipo de valor', () => {
  it('real siempre dice a pesos de que mes', () => {
    expect(texto(etiquetaTipoValor('nominal'))).toBe('nominal')
    expect(texto(etiquetaTipoValor('real', new Date(2026, 7, 1)))).toBe('real (pesos de ago-2026)')
    expect(texto(etiquetaTipoValor('usd_mep'))).toBe('USD MEP')
  })

  it('importe etiquetado: ninguna cifra ambigua', () => {
    expect(texto(formatearImporteEtiquetado(4_820_000_000, 'nominal'))).toBe('$ 48.200.000 nominal')
    expect(
      texto(formatearImporteEtiquetado(3_140_000_000, 'real', { mesBase: new Date(2026, 7, 1) })),
    ).toBe('$ 31.400.000 real (pesos de ago-2026)')
  })
})

describe('formatearMomento', () => {
  const hoy = new Date(2026, 7, 25, 10, 22) // 25/08/2026 10:22

  it('muestra solo la hora si el dato es de hoy', () => {
    expect(formatearMomento(new Date(2026, 7, 25, 9, 5), hoy)).toBe('09:05')
  })

  it('agrega la fecha si el dato es de otro dia', () => {
    // El caso real: el mercado cerro ayer a las 23:00 y "23:00" a secas se lee
    // como si la cotizacion fuera de recien.
    expect(formatearMomento(new Date(2026, 7, 24, 23, 0), hoy)).toBe('24/08 23:00')
  })

  it('sin dato no muestra un guion mudo', () => {
    expect(formatearMomento(null, hoy)).toBe('sin hora')
  })
})
