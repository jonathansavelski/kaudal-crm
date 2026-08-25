/**
 * Las dos unicas escrituras que el front de Kaudal hace contra Supabase.
 *
 * La RLS (rule `supabase.md` §1) abre `insert`/`update` a `authenticated` solo sobre
 * `empresas`, `contactos`, `oportunidades` y `acciones_comerciales`. Facturas, cobros,
 * contratos y campanias son de solo lectura desde el navegador: se cargan por seed con la
 * secret key, que nunca sale de la maquina local. Por eso no hay aca una funcion para
 * crear una factura: no fallaria por un bug, fallaria porque no corresponde.
 *
 * `delete` no lo tiene nadie: ninguna pantalla borra.
 */

import { supabase } from '@/lib/supabase'
import type { Enums, TablesInsert } from '@/types/supabase'

export type NuevaAccion = {
  empresaId: string
  contactoId: string | null
  oportunidadId: string | null
  campaniaId: string | null
  tipo: Enums<'tipo_accion'>
  resultado: Enums<'resultado_accion'>
  fecha: string
  costoCentavos: number
  moneda: Enums<'moneda'>
  notas: string | null
}

/**
 * Alta de una accion comercial. El costo llega en **centavos enteros**: la validacion del
 * formulario ya convirtio los pesos que escribio el usuario (rule `dinero.md` §1).
 */
export async function crearAccionComercial(datos: NuevaAccion): Promise<string> {
  const fila: TablesInsert<'acciones_comerciales'> = {
    empresa_id: datos.empresaId,
    contacto_id: datos.contactoId,
    oportunidad_id: datos.oportunidadId,
    campania_id: datos.campaniaId,
    tipo: datos.tipo,
    resultado: datos.resultado,
    fecha: datos.fecha,
    costo_centavos: datos.costoCentavos,
    moneda: datos.moneda,
    notas: datos.notas,
  }

  const { data, error } = await supabase
    .from('acciones_comerciales')
    .insert(fila)
    .select('id')
    .single()

  if (error) throw new Error(`No pudimos guardar la acción comercial: ${error.message}`)

  return data.id
}

/** Cambio de estado comercial de una cuenta: el unico campo editable de `empresas`. */
export async function actualizarEstadoComercial(
  empresaId: string,
  estado: Enums<'estado_comercial'>,
): Promise<void> {
  const { error } = await supabase
    .from('empresas')
    .update({ estado_comercial: estado })
    .eq('id', empresaId)

  if (error) throw new Error(`No pudimos actualizar el estado comercial: ${error.message}`)
}
