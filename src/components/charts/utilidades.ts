/**
 * Piezas compartidas por los graficos: margenes, formateadores de eje y el mapeo de
 * "estado de la query" a "estado del panel".
 *
 * Los formateadores solo delegan en `src/lib/formato.ts`: ningun `Intl` ni
 * `toLocaleString` fuera de ese archivo (rule `dinero.md` §5).
 */

import type { EstadoPanel } from '@/components/charts/ContenedorGrafico'
import { formatearImporteAbreviado, formatearMesAnioCorto, formatearPorcentaje } from '@/lib/formato'

/** Margen de base del skill; `left` se agranda solo si el eje Y lo pide. */
export const MARGEN = { top: 8, right: 12, bottom: 8, left: 8 } as const

export const TRAZO = 2.5
export const RADIO_BARRA = [4, 4, 0, 0] as const
export const RADIO_BARRA_HORIZONTAL = [0, 4, 4, 0] as const

export const CURSOR_BARRAS = { fill: 'var(--accent)', opacity: 0.4 } as const
export const CURSOR_LINEAS = { stroke: 'var(--border)' } as const

export const EJE = {
  stroke: 'var(--muted-foreground)',
  fontSize: 12,
} as const

/** Eje Y de importes: siempre abreviado (`$ 1,2 M`), nunca el numero completo. */
export function ejeImporte(centavos: number): string {
  return formatearImporteAbreviado(centavos)
}

/** Eje X de tiempo: `ago 26`. */
export function ejeMes(periodo: string): string {
  return formatearMesAnioCorto(periodo)
}

export function ejePorcentaje(ratio: number): string {
  return formatearPorcentaje(ratio, 1)
}

/**
 * Intervalo de ticks para que una serie larga no amontone etiquetas: uno cada tres
 * meses en la serie de 24 (skill `charts-crm` §2).
 */
export function intervaloTicks(puntos: number): number {
  return puntos > 12 ? 2 : 0
}

/** Trunca una etiqueta larga del eje Y de las barras horizontales. */
export function truncar(texto: string, largo = 22): string {
  return texto.length <= largo ? texto : texto.slice(0, largo - 1) + '…'
}

export function estadoDePanel(entrada: {
  cargando: boolean
  error: boolean
  vacio: boolean
}): EstadoPanel {
  if (entrada.error) return 'error'
  if (entrada.cargando) return 'cargando'
  if (entrada.vacio) return 'vacio'
  return 'listo'
}
