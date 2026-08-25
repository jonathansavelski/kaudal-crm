/**
 * Mutaciones del CRM con TanStack Query.
 *
 * Las dos invalidan la misma clave (`CLAVE_DATOS_CRM`), que es la unica query de datos:
 * asi el dashboard, la ficha y la tabla de acciones se actualizan solos despues de un
 * alta, sin que ninguna pantalla tenga que acordarse de refrescar.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CLAVE_DATOS_CRM } from '@/hooks/use-datos-dashboard'
import type { NuevaAccion } from '@/lib/api/mutaciones'
import { actualizarEstadoComercial, crearAccionComercial } from '@/lib/api/mutaciones'
import type { Enums } from '@/types/supabase'

export function useCrearAccion() {
  const cliente = useQueryClient()

  return useMutation({
    mutationFn: (datos: NuevaAccion) => crearAccionComercial(datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_DATOS_CRM }),
  })
}

export function useEditarEstadoComercial() {
  const cliente = useQueryClient()

  return useMutation({
    mutationFn: (datos: { empresaId: string; estado: Enums<'estado_comercial'> }) =>
      actualizarEstadoComercial(datos.empresaId, datos.estado),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_DATOS_CRM }),
  })
}
