/**
 * Acceso a la sesion de Supabase desde cualquier punto del arbol.
 *
 * La fuente de verdad es la sesion de Supabase, nunca un flag propio: si el token
 * expira o se cierra sesion en otra pestana, el guard de rutas se entera.
 */

import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type EstadoSesion = {
  sesion: Session | null
  /** `true` mientras se resuelve la sesion inicial: evita el flash del login. */
  cargando: boolean
  cerrarSesion: () => Promise<void>
}

export const ContextoSesion = createContext<EstadoSesion | null>(null)

export function useSesion(): EstadoSesion {
  const estado = useContext(ContextoSesion)
  if (!estado) throw new Error('useSesion se usa dentro de <ProveedorSesion>')

  return estado
}
