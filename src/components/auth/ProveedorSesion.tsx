import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { ContextoSesion } from '@/hooks/use-sesion'
import { supabase } from '@/lib/supabase'

/**
 * Resuelve la sesion inicial una sola vez y despues escucha los cambios que emite
 * Supabase (login, logout, refresh de token, cierre en otra pestana).
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const clienteQuery = useQueryClient()

  useEffect(() => {
    let vigente = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return
      setSesion(data.session)
      setCargando(false)
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, sesionNueva) => {
      setSesion(sesionNueva)
      setCargando(false)
    })

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
    // Los datos cacheados son de la sesion que se cierra: no los hereda la proxima.
    clienteQuery.clear()
  }, [clienteQuery])

  const valor = useMemo(() => ({ sesion, cargando, cerrarSesion }), [sesion, cargando, cerrarSesion])

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
