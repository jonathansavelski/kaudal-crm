/**
 * Estado de filtros, orden y paginado en la **URL**, no en `useState`.
 *
 * La rule `ui.md` §6 lo pide explicito: si alguien manda el link, tiene que llegar a la
 * misma vista. Un `useState` se pierde con el F5 y no se puede compartir.
 *
 * Todo se escribe con `replace: true` para no llenar el historial del navegador con un
 * paso por cada tecla del buscador.
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type Filtros = Readonly<Record<string, string>>

export type ControlesFiltros<C extends string = string> = {
  /**
   * Los valores de las claves declaradas, ya leidos de la URL. Es un objeto **estable**
   * mientras la URL no cambie, asi el `useMemo` que filtra rio abajo no se recalcula en
   * cada render.
   */
  valores: Readonly<Record<C, string>>
  /** Valor del parametro, o cadena vacia si no esta. */
  leer: (clave: string) => string
  /** Numero del parametro, o `porDefecto` si esta ausente, vacio o no es un numero. */
  leerNumero: (clave: string, porDefecto: number) => number
  /** Escribe (o borra, si el valor es vacio) y vuelve a la primera pagina. */
  fijar: (clave: string, valor: string) => void
  /** Escribe varias claves de una, sin pasos intermedios en el historial. */
  fijarVarias: (cambios: Filtros) => void
  /** Borra todas las claves declaradas. */
  limpiar: () => void
  /** Cuantas de las claves declaradas tienen valor. */
  cantidadActivos: number
}

/** Clave reservada del paginado: cambiar un filtro siempre vuelve a la pagina 1. */
export const PARAM_PAGINA = 'pagina'

/**
 * @param claves Las claves de filtro que maneja la pantalla. Se declaran para que
 * `limpiar` no borre parametros de otra cosa (el simulador de `/mercado`, por ejemplo).
 * @param clavePagina Cual es el parametro de paginado a reiniciar. Se puede cambiar
 * porque en `/acciones` conviven dos tablas, cada una con su propio paginado.
 */
export function useFiltrosUrl<C extends string>(
  claves: readonly C[],
  clavePagina: string = PARAM_PAGINA,
): ControlesFiltros<C> {
  const [parametros, setParametros] = useSearchParams()

  const escribir = useCallback(
    (cambios: Filtros, reiniciarPagina: boolean) => {
      const siguientes = new URLSearchParams(parametros)

      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === '') siguientes.delete(clave)
        else siguientes.set(clave, valor)
      }
      if (reiniciarPagina) siguientes.delete(clavePagina)

      setParametros(siguientes, { replace: true })
    },
    [parametros, setParametros, clavePagina],
  )

  const leer = useCallback((clave: string) => parametros.get(clave) ?? '', [parametros])

  // `parametros` de react-router ya viene memorizado contra `location.search`, y `claves`
  // es una constante de modulo en cada pantalla: la referencia solo cambia con la URL.
  const valores = useMemo(() => {
    const leidos = {} as Record<C, string>
    for (const clave of claves) leidos[clave] = parametros.get(clave) ?? ''
    return leidos
  }, [parametros, claves])

  const cantidadActivos = claves.filter((clave) => (parametros.get(clave) ?? '') !== '').length

  return {
    valores,
    leer,
    leerNumero: (clave, porDefecto) => {
      // Ojo: `Number(null)` es 0, no NaN. Sin este chequeo, un parametro ausente
      // devolveria cero y el tamanio de pagina quedaria en 0 filas.
      const crudo = parametros.get(clave)
      if (crudo === null || crudo.trim() === '') return porDefecto

      const valor = Number(crudo)
      return Number.isFinite(valor) ? valor : porDefecto
    },
    fijar: (clave, valor) => escribir({ [clave]: valor }, clave !== clavePagina),
    fijarVarias: (cambios) => escribir(cambios, true),
    limpiar: () => escribir(Object.fromEntries(claves.map((clave) => [clave, ''])), true),
    cantidadActivos,
  }
}
