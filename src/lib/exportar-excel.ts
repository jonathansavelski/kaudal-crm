/**
 * Exportacion a Excel con SheetJS.
 *
 * Se exporta **lo que se ve**: el resultado ya filtrado y ordenado de la pantalla, no la
 * tabla entera. Si el usuario filtro 37 de 120 cuentas, el archivo trae 37.
 *
 * Los importes salen como **pesos con dos decimales** (centavos / 100), no como centavos,
 * porque el que abre el Excel espera plata, no la unidad interna. La conversion pasa una
 * sola vez, aca, y el nombre de la columna dice siempre si es nominal, real o USD MEP
 * (rule `dinero.md` §3).
 */

import { utils, writeFileXLSX } from 'xlsx'

import { formatearFecha } from '@/lib/formato'

/** Excel rechaza estos caracteres en el nombre de una hoja. */
const RESERVADOS_HOJA = ['[', ']', ':', '*', '?', '/', String.fromCharCode(92)]

/** Una celda de Excel: texto, numero o fecha ya formateada. Nunca un objeto. */
export type CeldaExcel = string | number | null

export type FilaExcel = Record<string, CeldaExcel>

export type HojaExcel = {
  nombre: string
  filas: readonly FilaExcel[]
}

/** Centavos a pesos con dos decimales, para que Excel los sume bien. */
export function aPesos(centavos: number | null | undefined): number | null {
  if (typeof centavos !== 'number' || !Number.isFinite(centavos)) return null
  return Math.round(centavos) / 100
}

/** Fecha ISO a `dd/MM/yyyy`, que es como se lee en `es-AR`. */
export function aFechaExcel(iso: string | null | undefined): string {
  return iso ? formatearFecha(iso) : ''
}

/** Nombre de hoja valido para Excel: 31 caracteres, sin los reservados por el formato. */
function sanearNombreHoja(nombre: string): string {
  const limpio = [...nombre].map((letra) => (RESERVADOS_HOJA.includes(letra) ? ' ' : letra))
  return limpio.join('').slice(0, 31)
}

/**
 * Descarga un `.xlsx` con una hoja por entrada. Ancho de columna aproximado al
 * contenido, para que no salga todo cortado.
 */
export function descargarExcel(nombreArchivo: string, hojas: readonly HojaExcel[]): void {
  const libro = utils.book_new()

  for (const hoja of hojas) {
    const hojaExcel = utils.json_to_sheet(hoja.filas as FilaExcel[])
    const encabezados = Object.keys(hoja.filas[0] ?? {})

    hojaExcel['!cols'] = encabezados.map((encabezado) => {
      const largos = hoja.filas.map((fila) => String(fila[encabezado] ?? '').length)
      return { wch: Math.min(42, Math.max(encabezado.length + 2, ...largos, 10)) }
    })

    utils.book_append_sheet(libro, hojaExcel, sanearNombreHoja(hoja.nombre))
  }

  writeFileXLSX(libro, nombreArchivo)
}
