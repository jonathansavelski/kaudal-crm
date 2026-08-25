/**
 * Nucleo compartido de las cuatro tablas de Kaudal (cuentas, facturas, acciones,
 * campanias). Una sola configuracion de TanStack Table: si cada pantalla armara la suya,
 * el orden, el paginado y el selector de columnas se comportarian distinto en cada una.
 *
 * El estado que vale la pena compartir — orden, pagina, columnas ocultas — vive en la
 * **URL** (rule `ui.md` §6). El hook lo lee de ahi y lo escribe ahi.
 */

import type { ColumnDef, ColumnVisibilityState, RowData, SortingState } from '@tanstack/react-table'
import {
  columnVisibilityFeature,
  createCoreRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

import { useFiltrosUrl } from '@/hooks/use-filtros-url'

/** Los importes van a la derecha; fechas y textos, a la izquierda (rule `ui.md` §2). */
export type AlineacionColumna = 'izquierda' | 'derecha'

/** Metadatos propios: como se alinea la columna y como se llama en el selector. */
export type MetaColumna = {
  /** Nombre humano de la columna. Lo usa el selector de columnas visibles. */
  etiqueta: string
  alineacion?: AlineacionColumna
  /** Columna que no se puede ocultar: sin ella la fila no se identifica. */
  fija?: boolean
}

export const CARACTERISTICAS = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  coreRowModel: createCoreRowModel(),
  columnMeta: {} as MetaColumna,
})

export type Caracteristicas = typeof CARACTERISTICAS

/** Definicion de columna de Kaudal: TanStack Table con nuestro `meta` obligatorio. */
export type ColumnaKaudal<TData extends RowData> = ColumnDef<Caracteristicas, TData>

export const TAMANIOS_PAGINA = [10, 25, 50, 100] as const
const TAMANIO_POR_DEFECTO = 25

export const PARAM_ORDEN = 'orden'
export const PARAM_PAGINA = 'pagina'
export const PARAM_TAMANIO = 'tam'
export const PARAM_OCULTAS = 'cols'

const PARAMETROS_TABLA = [PARAM_ORDEN, PARAM_PAGINA, PARAM_TAMANIO, PARAM_OCULTAS]

/**
 * Dos tablas en la misma pantalla (acciones y campanias) no pueden compartir los mismos
 * parametros de URL: el orden de una pisaria el de la otra. El prefijo los separa.
 */
function conPrefijo(prefijo: string): readonly string[] {
  return PARAMETROS_TABLA.map((clave) => prefijo + clave)
}

/** `monto:desc` -> `[{ id: 'monto', desc: true }]`. */
function leerOrden(crudo: string, porDefecto: SortingState): SortingState {
  if (crudo === '') return porDefecto

  const [id, sentido] = crudo.split(':')
  if (!id) return porDefecto

  return [{ id, desc: sentido !== 'asc' }]
}

function escribirOrden(orden: SortingState): string {
  const primero = orden[0]
  return primero ? `${primero.id}:${primero.desc ? 'desc' : 'asc'}` : ''
}

/**
 * `cols` lista las columnas ocultas. El centinela `-` significa "ninguna oculta": hace
 * falta para poder volver a mostrar una columna que arranca escondida por defecto sin
 * que el parametro vacio la vuelva a ocultar.
 */
function leerOcultas(crudo: string, porDefecto: readonly string[]): ColumnVisibilityState {
  const ids = crudo === '' ? porDefecto : crudo === '-' ? [] : crudo.split(',')
  const visibilidad: ColumnVisibilityState = {}

  for (const id of ids) {
    if (id !== '') visibilidad[id] = false
  }

  return visibilidad
}

function aplicar<T>(valor: T, actualizador: T | ((previo: T) => T)): T {
  return typeof actualizador === 'function' ? (actualizador as (previo: T) => T)(valor) : actualizador
}

/**
 * Arma la tabla con su estado atado a la URL.
 *
 * `datos` ya viene filtrado por la pantalla: el filtrado de dominio vive en
 * `src/lib/agregados/`, para que el contador de "X de Y" y el Excel exportado salgan
 * del mismo conjunto que la tabla.
 */
export function useTablaKaudal<TData extends RowData>({
  columnas,
  datos,
  ordenPorDefecto,
  ocultasPorDefecto = [],
  prefijo = '',
}: {
  columnas: readonly ColumnaKaudal<TData>[]
  datos: readonly TData[]
  ordenPorDefecto: SortingState
  /** Columnas que arrancan escondidas para que la tabla entre sin scroll horizontal. */
  ocultasPorDefecto?: readonly string[]
  /** Prefijo de los parametros de URL, para cuando hay dos tablas en la misma pantalla. */
  prefijo?: string
}) {
  const url = useFiltrosUrl(conPrefijo(prefijo), prefijo + PARAM_PAGINA)

  const claveOrden = prefijo + PARAM_ORDEN
  const clavePagina = prefijo + PARAM_PAGINA
  const claveTamanio = prefijo + PARAM_TAMANIO
  const claveOcultas = prefijo + PARAM_OCULTAS

  const orden = leerOrden(url.leer(claveOrden), ordenPorDefecto)
  const columnVisibility = leerOcultas(url.leer(claveOcultas), ocultasPorDefecto)
  const pageSize = url.leerNumero(claveTamanio, TAMANIO_POR_DEFECTO)
  const pageIndex = Math.max(0, url.leerNumero(clavePagina, 1) - 1)

  return useTable<Caracteristicas, TData>({
    features: CARACTERISTICAS,
    columns: columnas as ColumnDef<Caracteristicas, TData>[],
    data: datos,
    state: { sorting: orden, columnVisibility, pagination: { pageIndex, pageSize } },
    onSortingChange: (actualizador) => {
      url.fijarVarias({ [claveOrden]: escribirOrden(aplicar(orden, actualizador)) })
    },
    onColumnVisibilityChange: (actualizador) => {
      const siguiente = aplicar(columnVisibility, actualizador)
      const ocultas = Object.entries(siguiente)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id)
      url.fijarVarias({ [claveOcultas]: ocultas.length === 0 ? '-' : ocultas.join(',') })
    },
    onPaginationChange: (actualizador) => {
      const siguiente = aplicar({ pageIndex, pageSize }, actualizador)
      url.fijar(clavePagina, siguiente.pageIndex === 0 ? '' : String(siguiente.pageIndex + 1))
      if (siguiente.pageSize !== pageSize) {
        url.fijarVarias({ [claveTamanio]: String(siguiente.pageSize) })
      }
    },
  })
}

export type TablaKaudal<TData extends RowData> = ReturnType<typeof useTablaKaudal<TData>>

/** Valor de `aria-sort` para el `<th>`: el indicador tambien viaja al lector de pantalla. */
export function ariaSort(sentido: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (sentido === 'asc') return 'ascending'
  if (sentido === 'desc') return 'descending'
  return 'none'
}
