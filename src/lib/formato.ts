/**
 * Formateo centralizado de Kaudal (rule `dinero.md` §5).
 *
 * **Este es el unico archivo de `src/` que puede llamar a `Intl.NumberFormat` o a
 * `toLocaleString`.** Si falta un formateador, se agrega aca; no se improvisa en el
 * componente. Asi todas las pantallas muestran la misma cifra de la misma forma.
 *
 * Tres reglas que atraviesan todo el archivo:
 *  1. La entrada de plata son **centavos enteros**. El redondeo pasa una sola vez, aca.
 *  2. Un valor que no se pudo calcular (`null`, `NaN`, `Infinity`) nunca llega a
 *     pantalla como guion mudo: se devuelve un texto que explica por que no hay numero.
 *  3. Cero es un valor legitimo y se muestra `$ 0`.
 */

import { format, formatDistanceStrict, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Moneda } from '@/lib/metricas/tipos'

const LOCALE = 'es-AR'

/** Texto por defecto cuando el dato no existe o el calculo no se pudo hacer. */
export const SIN_DATO = 'sin datos suficientes'

/**
 * Los tres tipos de valor que Kaudal sabe mostrar. Ninguna cifra sale a pantalla sin
 * uno de estos tres pegado al lado (rule `dinero.md` §3).
 */
export type TipoValor = 'nominal' | 'real' | 'usd_mep'

type ValorPosible = number | null | undefined

/** Un numero utilizable: ni null, ni NaN, ni Infinity. */
function esUsable(valor: ValorPosible): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function numero(valor: number, minDecimales: number, maxDecimales: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: minDecimales,
    maximumFractionDigits: maxDecimales,
  }).format(valor)
}

// ---------------------------------------------------------------------------
// Plata
// ---------------------------------------------------------------------------

/**
 * Importe completo, con simbolo de moneda y separadores `es-AR`.
 *
 * Sin decimales, salvo que el valor absoluto sea menor a 100 (ahi los centavos
 * importan). Los negativos van con signo menos, nunca entre parentesis.
 *
 *     formatearImporte(1_234_567)        -> '$ 12.346'
 *     formatearImporte(4_550)            -> '$ 45,50'
 *     formatearImporte(0)                -> '$ 0'
 *     formatearImporte(null)             -> 'sin datos suficientes'
 */
export function formatearImporte(
  centavos: ValorPosible,
  moneda: Moneda = 'ARS',
  siNoHayDato: string = SIN_DATO,
): string {
  if (!esUsable(centavos)) return siNoHayDato

  const pesos = centavos / 100
  const decimales = Math.abs(pesos) < 100 && pesos !== 0 ? 2 : 0

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(pesos)
}

const SIMBOLO_MONEDA: Record<Moneda, string> = { ARS: '$', USD: 'US$' }

/**
 * Importe abreviado para ejes de graficos (skill `charts-crm` §2).
 * Nunca se usa en tablas ni en fichas de detalle, donde hace falta la cifra exacta.
 *
 *     formatearImporteAbreviado(120_000_000)  -> '$ 1,2 M'
 *     formatearImporteAbreviado(85_000_000)   -> '$ 850 k'
 *     formatearImporteAbreviado(-120_000_000) -> '-$ 1,2 M'
 *     formatearImporteAbreviado(0)            -> '$ 0'
 */
export function formatearImporteAbreviado(
  centavos: ValorPosible,
  moneda: Moneda = 'ARS',
  siNoHayDato: string = SIN_DATO,
): string {
  if (!esUsable(centavos)) return siNoHayDato

  const pesos = centavos / 100
  const absoluto = Math.abs(pesos)
  const signo = pesos < 0 ? '-' : ''
  const simbolo = SIMBOLO_MONEDA[moneda]

  const escala =
    absoluto >= 1_000_000_000
      ? { divisor: 1_000_000_000, sufijo: ' MM' }
      : absoluto >= 1_000_000
        ? { divisor: 1_000_000, sufijo: ' M' }
        : absoluto >= 1_000
          ? { divisor: 1_000, sufijo: ' k' }
          : { divisor: 1, sufijo: '' }

  const escalado = absoluto / escala.divisor
  // Un decimal solo mientras la cifra escalada sea chica: '$ 1,2 M' pero '$ 850 k'.
  const decimales = escalado < 10 && escala.divisor > 1 ? 1 : 0

  return `${signo}${simbolo} ${numero(escalado, 0, decimales)}${escala.sufijo}`
}

// ---------------------------------------------------------------------------
// Numeros sin moneda
// ---------------------------------------------------------------------------

/** Cantidad entera con separador de miles: `1.400 facturas`. */
export function formatearCantidad(valor: ValorPosible, siNoHayDato: string = SIN_DATO): string {
  if (!esUsable(valor)) return siNoHayDato

  return numero(Math.round(valor), 0, 0)
}

/**
 * Ratio a porcentaje. Recibe la proporcion (`0,124`), no el numero ya multiplicado.
 *
 *     formatearPorcentaje(0.124)  -> '12,4%'
 *     formatearPorcentaje(null)   -> 'sin datos suficientes'
 */
export function formatearPorcentaje(
  ratio: ValorPosible,
  decimales = 1,
  siNoHayDato: string = SIN_DATO,
): string {
  if (!esUsable(ratio)) return siNoHayDato

  return `${numero(ratio * 100, 0, decimales)}%`
}

/** Indice o coeficiente sin unidad (HHI, score de riesgo, TEA en veces). */
export function formatearIndice(
  valor: ValorPosible,
  decimales = 0,
  siNoHayDato: string = SIN_DATO,
): string {
  if (!esUsable(valor)) return siNoHayDato

  return numero(valor, 0, decimales)
}

/** Dias, con singular y plural. Cero es un valor legitimo: `0 dias`. */
export function formatearDias(valor: ValorPosible, siNoHayDato: string = SIN_DATO): string {
  if (!esUsable(valor)) return siNoHayDato

  const redondeado = Math.round(valor)
  return `${numero(redondeado, 0, 0)} ${Math.abs(redondeado) === 1 ? 'día' : 'días'}`
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function aFecha(valor: Date | string | null | undefined): Date | null {
  if (valor === null || valor === undefined) return null

  // Una fecha `date` de Postgres llega como 'YYYY-MM-DD': se lee como local para que no
  // se corra un dia por zona horaria.
  const fecha =
    typeof valor === 'string'
      ? /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(`${valor}T00:00:00`)
        : new Date(valor)
      : valor

  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** `dd/MM/yyyy`. */
export function formatearFecha(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin fecha',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'dd/MM/yyyy', { locale: es }) : siNoHayDato
}

/** `dd/MM` — para carteles cortos, como el de cotizacion cacheada. */
export function formatearFechaBreve(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin fecha',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'dd/MM', { locale: es }) : siNoHayDato
}

/** `ago 2026` — encabezados y ejes de tiempo. */
export function formatearMesAnio(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin período',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'MMM yyyy', { locale: es }) : siNoHayDato
}

/** `ago-2026` — el formato que usa la etiqueta de valor real (rule `dinero.md` §3). */
export function formatearMesAnioGuion(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin período',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'MMM-yyyy', { locale: es }) : siNoHayDato
}

/** `ago 26` — ticks del eje X en series largas. */
export function formatearMesAnioCorto(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin período',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'MMM yy', { locale: es }) : siNoHayDato
}

/** `14:35` — indicador de ultima actualizacion. */
export function formatearHora(
  valor: Date | string | null | undefined,
  siNoHayDato = 'sin hora',
): string {
  const fecha = aFecha(valor)
  return fecha ? format(fecha, 'HH:mm', { locale: es }) : siNoHayDato
}

/**
 * `14:35` si es del mismo dia que `hoy`, `24/08 23:00` si no.
 *
 * Existe porque mostrar solo la hora de un dato de ayer se lee como si fuera de
 * recien: el viernes a la tarde el mercado cierra y la cotizacion queda con la
 * hora del cierre, que el lunes a la manana seguiria diciendo "23:00" a secas.
 * `hoy` se recibe como parametro para que el formateo sea determinista.
 */
export function formatearMomento(
  valor: Date | string | null | undefined,
  hoy: Date,
  siNoHayDato = 'sin hora',
): string {
  const fecha = aFecha(valor)
  if (!fecha) return siNoHayDato

  return isSameDay(fecha, hoy) ? format(fecha, 'HH:mm', { locale: es }) : format(fecha, 'dd/MM HH:mm', { locale: es })
}

/** `hace 5 minutos`. `desde` se recibe para que el formateo siga siendo determinista. */
export function formatearAntiguedad(
  valor: Date | string | null | undefined,
  desde: Date,
  siNoHayDato = 'sin dato',
): string {
  const fecha = aFecha(valor)
  if (!fecha) return siNoHayDato

  return `hace ${formatDistanceStrict(fecha, desde, { locale: es })}`
}

// ---------------------------------------------------------------------------
// Etiquetas de tipo de valor (rule dinero.md §3)
// ---------------------------------------------------------------------------

/**
 * La etiqueta que acompana a toda cifra. `real` exige decir a pesos de que mes:
 * "real" a secas no significa nada.
 *
 *     etiquetaTipoValor('nominal')                      -> 'nominal'
 *     etiquetaTipoValor('real', new Date(2026, 7, 1))   -> 'real (pesos de ago-2026)'
 *     etiquetaTipoValor('usd_mep')                      -> 'USD MEP'
 */
export function etiquetaTipoValor(
  tipo: TipoValor,
  mesBase?: Date | string | null,
  fechaCotizacion?: Date | string | null,
): string {
  switch (tipo) {
    case 'nominal':
      return 'nominal'
    case 'real':
      return mesBase ? `real (pesos de ${formatearMesAnioGuion(mesBase)})` : 'real'
    case 'usd_mep':
      return fechaCotizacion ? `USD MEP al ${formatearFecha(fechaCotizacion)}` : 'USD MEP'
  }
}

/** Importe y etiqueta juntos: `$ 48.200.000 nominal`. */
export function formatearImporteEtiquetado(
  centavos: ValorPosible,
  tipo: TipoValor,
  opciones: { moneda?: Moneda; mesBase?: Date | string | null; siNoHayDato?: string } = {},
): string {
  const { moneda = tipo === 'usd_mep' ? 'USD' : 'ARS', mesBase, siNoHayDato = SIN_DATO } = opciones
  if (!esUsable(centavos)) return siNoHayDato

  return `${formatearImporte(centavos, moneda)} ${etiquetaTipoValor(tipo, mesBase)}`
}
