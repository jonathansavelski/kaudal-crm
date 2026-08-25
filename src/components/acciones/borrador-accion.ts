/**
 * Borrador y validacion del alta de accion comercial.
 *
 * Vive aparte del componente para que la validacion se pueda leer y testear sin JSX
 * alrededor. El costo entra en **pesos** (lo que el usuario escribe) y sale en
 * **centavos enteros** (lo que la base guarda): la conversion pasa una sola vez, aca.
 */

import { aIso } from '@/lib/agregados/facturas'
import type { NuevaAccion } from '@/lib/api/mutaciones'
import {
  ETIQUETA_MONEDA,
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
  RESULTADOS_ACCION,
  TIPOS_ACCION,
} from '@/lib/etiquetas'

/** Opciones de los selectores del formulario, derivadas de los enums del esquema. */
export const OPCIONES_TIPO_ACCION = TIPOS_ACCION.map((tipo) => ({
  valor: tipo,
  etiqueta: ETIQUETA_TIPO_ACCION[tipo],
}))

export const OPCIONES_RESULTADO_ACCION = RESULTADOS_ACCION.map((resultado) => ({
  valor: resultado,
  etiqueta: ETIQUETA_RESULTADO_ACCION[resultado],
}))

export const OPCIONES_MONEDA = (['ARS', 'USD'] as const).map((moneda) => ({
  valor: moneda,
  etiqueta: ETIQUETA_MONEDA[moneda],
}))

export type BorradorAccion = {
  tipo: string
  resultado: string
  fecha: string
  costo: string
  moneda: string
  contactoId: string
  oportunidadId: string
  campaniaId: string
  notas: string
}

export const MAX_NOTAS = 500

export function borradorInicial(hoy: Date): BorradorAccion {
  return {
    tipo: 'llamada',
    resultado: 'neutro',
    fecha: aIso(hoy),
    costo: '0',
    moneda: 'ARS',
    contactoId: '',
    oportunidadId: '',
    campaniaId: '',
    notas: '',
  }
}

/** El error a mostrar, o `null` si el borrador esta completo y es coherente. */
export function validarBorrador(borrador: BorradorAccion, hoy: Date): string | null {
  if (borrador.fecha === '') return 'Poné la fecha de la acción.'
  if (borrador.fecha > aIso(hoy)) {
    return 'La fecha no puede ser futura: esto registra algo que ya pasó.'
  }

  const costo = Number(borrador.costo)
  if (!Number.isFinite(costo)) return 'El costo tiene que ser un número.'
  if (costo < 0) return 'El costo no puede ser negativo. Una acción gratis vale 0.'

  if (borrador.notas.length > MAX_NOTAS) {
    return `Las notas no pueden pasar de ${MAX_NOTAS} caracteres.`
  }

  return null
}

export function aNuevaAccion(borrador: BorradorAccion, empresaId: string): NuevaAccion {
  return {
    empresaId,
    contactoId: borrador.contactoId === '' ? null : borrador.contactoId,
    oportunidadId: borrador.oportunidadId === '' ? null : borrador.oportunidadId,
    campaniaId: borrador.campaniaId === '' ? null : borrador.campaniaId,
    tipo: borrador.tipo as NuevaAccion['tipo'],
    resultado: borrador.resultado as NuevaAccion['resultado'],
    fecha: borrador.fecha,
    costoCentavos: Math.round(Number(borrador.costo) * 100),
    moneda: borrador.moneda as NuevaAccion['moneda'],
    notas: borrador.notas.trim() === '' ? null : borrador.notas.trim(),
  }
}
