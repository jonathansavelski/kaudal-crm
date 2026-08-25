/**
 * Login contra Supabase Auth, con los errores traducidos a algo que se entienda.
 *
 * El usuario demo va **visible en la pantalla de login** a proposito: es un TP y el
 * corrector tiene que poder entrar sin buscar credenciales (rule `supabase.md` §6).
 */

import { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const CREDENCIALES_DEMO = {
  email: 'demo@demo.com',
  password: 'pia2026',
} as const

/**
 * Traduce el error crudo de Supabase. Nunca se muestra el mensaje original: viene en
 * ingles y no le dice nada a quien esta mirando la pantalla.
 */
export function traducirErrorAuth(error: unknown): string {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.'
      case 'email_not_confirmed':
        return 'La cuenta existe pero no está confirmada. Avisale al administrador del demo.'
      case 'over_request_rate_limit':
        return 'Demasiados intentos seguidos. Esperá un minuto y volvé a probar.'
      case 'user_banned':
        return 'La cuenta está deshabilitada.'
      default:
        return 'No pudimos iniciar sesión. Probá de nuevo en unos segundos.'
    }
  }

  if (error instanceof TypeError) {
    return 'No pudimos conectar con el servidor de autenticación. Revisá tu conexión.'
  }

  return 'Ocurrió un error inesperado al iniciar sesión.'
}

/** Devuelve `null` si entro bien, o el mensaje de error ya traducido. */
export async function iniciarSesion(email: string, password: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? traducirErrorAuth(error) : null
  } catch (error) {
    return traducirErrorAuth(error)
  }
}
