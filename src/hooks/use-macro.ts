/**
 * Indicadores macro de `/mercado` que no salen de Supabase: riesgo pais y tasas de
 * plazo fijo. Cada uno en su propia query para que la caida de uno no tape al otro.
 */

import { useQuery } from '@tanstack/react-query'

import { obtenerRiesgoPais, obtenerTasasPlazoFijo } from '@/lib/api/argentinadatos'

export const CLAVE_RIESGO_PAIS = ['riesgo-pais'] as const
export const CLAVE_PLAZO_FIJO = ['plazo-fijo'] as const

export function useRiesgoPais() {
  return useQuery({
    queryKey: CLAVE_RIESGO_PAIS,
    queryFn: obtenerRiesgoPais,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

export function useTasasPlazoFijo() {
  return useQuery({
    queryKey: CLAVE_PLAZO_FIJO,
    queryFn: obtenerTasasPlazoFijo,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
