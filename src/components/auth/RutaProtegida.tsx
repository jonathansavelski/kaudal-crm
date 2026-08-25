import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PantallaCarga } from '@/components/layout/PantallaCarga'
import { useSesion } from '@/hooks/use-sesion'

/**
 * Guard de rutas. Lee la sesion de Supabase, no un flag propio: si el token no es
 * valido, no hay forma de quedar adentro.
 */
export function RutaProtegida() {
  const { sesion, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <PantallaCarga mensaje="Verificando la sesión…" />

  // Se guarda de donde venia para volver ahi despues del login, y no siempre al inicio.
  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }} />
  }

  return <Outlet />
}
