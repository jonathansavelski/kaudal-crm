/**
 * Mensaje legible de un error de mutacion.
 *
 * Existe para que ningun componente muestre `[object Object]` ni `undefined` cuando algo
 * falla del otro lado: si el error no trae mensaje, se dice lo que se sabe y se ofrece
 * reintentar, que es lo que pide la rule `ui.md` §1.
 */

export function mensajeDeError(error: unknown): string | null {
  if (error === null || error === undefined) return null
  if (error instanceof Error && error.message !== '') return error.message

  return 'No pudimos guardar el cambio. Probá de nuevo en unos segundos.'
}
