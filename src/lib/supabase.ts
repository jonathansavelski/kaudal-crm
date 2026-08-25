import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example a .env y completalas.',
  )
}

/**
 * Cliente unico y tipado. Al instanciarlo con `Database`, cada
 * `supabase.from('facturas').select()` devuelve filas tipadas y `any` no entra
 * por la puerta de atras (rule stack.md).
 *
 * Va la publishable key, que es publica por diseno y viaja en el bundle. Lo que
 * separa "usuario logueado" de "internet" es RLS, no el secreto de esta clave.
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
