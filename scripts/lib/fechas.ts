/**
 * Fechas del seed. Todo se maneja como string ISO 'YYYY-MM-DD' y toda la
 * aritmetica es en UTC.
 *
 * Por que no objetos Date locales: la maquina que corre el seed esta en
 * UTC-3. Un `new Date('2026-08-01')` se interpreta como UTC y al formatearlo
 * en local vuelve como 31/07. Con un solo corrimiento de ese tipo, una factura
 * de agosto cae en julio y la serie mensual del dashboard deja de cuadrar.
 */

export type Fecha = string // 'YYYY-MM-DD'
export type Mes = string // 'YYYY-MM'

const MS_POR_DIA = 86_400_000

function aMs(fecha: Fecha): number {
  const ms = Date.parse(`${fecha}T00:00:00.000Z`)
  if (Number.isNaN(ms)) throw new Error(`Fecha invalida: ${fecha}`)
  return ms
}

function aFecha(ms: number): Fecha {
  return new Date(ms).toISOString().slice(0, 10)
}

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  return aFecha(aMs(fecha) + dias * MS_POR_DIA)
}

/** Dias calendario de `desde` a `hasta`. Negativo si `hasta` es anterior. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return Math.round((aMs(hasta) - aMs(desde)) / MS_POR_DIA)
}

export function minFecha(a: Fecha, b: Fecha): Fecha {
  return a <= b ? a : b
}

export function maxFecha(a: Fecha, b: Fecha): Fecha {
  return a >= b ? a : b
}

export function mesDe(fecha: Fecha): Mes {
  return fecha.slice(0, 7)
}

export function primerDia(mes: Mes): Fecha {
  return `${mes}-01`
}

export function anioDe(mes: Mes): number {
  return Number(mes.slice(0, 4))
}

/** 1-12 */
export function numeroDeMes(mes: Mes): number {
  return Number(mes.slice(5, 7))
}

export function sumarMeses(mes: Mes, cantidad: number): Mes {
  const total = anioDe(mes) * 12 + (numeroDeMes(mes) - 1) + cantidad
  const anio = Math.floor(total / 12)
  const numero = (total % 12) + 1
  return `${String(anio).padStart(4, '0')}-${String(numero).padStart(2, '0')}`
}

export function mesesEntre(desde: Mes, hasta: Mes): number {
  return (anioDe(hasta) - anioDe(desde)) * 12 + (numeroDeMes(hasta) - numeroDeMes(desde))
}

export function ultimoDiaDelMes(mes: Mes): Fecha {
  return sumarDias(primerDia(sumarMeses(mes, 1)), -1)
}

/** Rango inclusivo de meses. */
export function rangoDeMeses(desde: Mes, hasta: Mes): Mes[] {
  const meses: Mes[] = []
  for (let i = 0; i <= mesesEntre(desde, hasta); i += 1) meses.push(sumarMeses(desde, i))
  return meses
}

/**
 * Estacionalidad comercial argentina (skill seed-financiero).
 * Afecta cuantas acciones y oportunidades se generan en cada fecha, no el
 * abono de los contratos, que es recurrente por definicion.
 */
export function factorEstacional(fecha: Fecha): number {
  const mes = numeroDeMes(mesDe(fecha))
  const dia = Number(fecha.slice(8, 10))

  if (mes === 1) return 0.4 // feria de enero
  if (mes === 7 && dia >= 16) return 0.6 // vacaciones de invierno
  if (mes === 3 || mes === 4 || mes === 9 || mes === 10) return 1.2 // picos
  if (mes === 12) return 0.8 // cierre de ano
  return 1
}
