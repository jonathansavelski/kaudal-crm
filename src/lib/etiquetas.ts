/**
 * Textos visibles de los enums del esquema. Los identificadores van sin acento ni enie
 * (rule del proyecto); lo que se muestra, no.
 *
 * Un solo lugar para que el mismo estado se lea igual en el grafico, en la leyenda y en
 * la tabla.
 */

import type { Enums } from '@/types/supabase'
import type { BucketAging, Canal, Etapa } from '@/lib/metricas/tipos'

export const ETIQUETA_ETAPA: Readonly<Record<Etapa, string>> = {
  prospecto: 'Prospecto',
  calificado: 'Calificado',
  demo: 'Demo',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganada: 'Ganada',
  perdida: 'Perdida',
}

/** Orden del embudo: es el proceso, nunca el monto (skill `charts-crm` §7). */
export const ETAPAS_ABIERTAS: readonly Etapa[] = [
  'prospecto',
  'calificado',
  'demo',
  'propuesta',
  'negociacion',
]

export const ETIQUETA_CANAL: Readonly<Record<Canal, string>> = {
  email: 'Email',
  eventos: 'Eventos',
  linkedin: 'LinkedIn',
  google_ads: 'Google Ads',
  contenido: 'Contenido',
  referidos: 'Referidos',
  telemarketing: 'Telemarketing',
  partners: 'Partners',
}

export const ETIQUETA_SECTOR: Readonly<Record<Enums<'sector_empresa'>, string>> = {
  transporte_y_logistica: 'Transporte y logística',
  distribucion_mayorista: 'Distribución mayorista',
  retail: 'Retail',
  agro: 'Agro',
  alimentos_y_bebidas: 'Alimentos y bebidas',
  manufactura: 'Manufactura',
  construccion: 'Construcción',
  salud: 'Salud',
  servicios_profesionales: 'Servicios profesionales',
  software_y_tecnologia: 'Software y tecnología',
}

export const ETIQUETA_BUCKET: Readonly<Record<BucketAging, string>> = {
  corriente: 'Corriente (no vencida)',
  '1-30': 'Vencida 1 a 30 días',
  '31-60': 'Vencida 31 a 60 días',
  '61-90': 'Vencida 61 a 90 días',
  '+90': 'Vencida más de 90 días',
  incobrable: 'Incobrable',
}

/** Color de cada bucket, por CSS var: cero hex hardcodeado (skill `charts-crm` §1). */
export const COLOR_BUCKET: Readonly<Record<BucketAging, string>> = {
  corriente: 'var(--aging-corriente)',
  '1-30': 'var(--aging-1-30)',
  '31-60': 'var(--aging-31-60)',
  '61-90': 'var(--aging-61-90)',
  '+90': 'var(--aging-90-mas)',
  incobrable: 'var(--aging-incobrable)',
}

export const ETIQUETA_LECTURA_HHI: Readonly<Record<'diversificada' | 'moderada' | 'concentrada', string>> = {
  diversificada: 'Cartera diversificada',
  moderada: 'Concentración moderada',
  concentrada: 'Cartera concentrada',
}

// ---------------------------------------------------------------------------
// Enums de las pantallas de la Fase 4
// ---------------------------------------------------------------------------

export const ETIQUETA_ESTADO_COMERCIAL: Readonly<Record<Enums<'estado_comercial'>, string>> = {
  prospecto: 'Prospecto',
  potencial: 'Potencial',
  conversaciones_avanzadas: 'Conversaciones avanzadas',
  cliente: 'Cliente',
  ex_cliente: 'Ex cliente',
}

/** El embudo de cuenta, en el orden del proceso comercial. */
export const ESTADOS_COMERCIALES: readonly Enums<'estado_comercial'>[] = [
  'prospecto',
  'potencial',
  'conversaciones_avanzadas',
  'cliente',
  'ex_cliente',
]

export const COLOR_ESTADO_COMERCIAL: Readonly<Record<Enums<'estado_comercial'>, string>> = {
  prospecto: 'var(--neutro)',
  potencial: 'var(--chart-3)',
  conversaciones_avanzadas: 'var(--chart-1)',
  cliente: 'var(--positivo)',
  ex_cliente: 'var(--negativo)',
}

export const ETIQUETA_TAMANIO: Readonly<Record<Enums<'tamanio_empresa'>, string>> = {
  micro: 'Micro',
  pyme: 'PyME',
  corporativa: 'Corporativa',
}

export const ETIQUETA_TIPO_OPORTUNIDAD: Readonly<Record<Enums<'tipo_oportunidad'>, string>> = {
  implementacion: 'Implementación',
  expansion: 'Expansión',
}

export const ETIQUETA_TIPO_ACCION: Readonly<Record<Enums<'tipo_accion'>, string>> = {
  email: 'Email',
  evento: 'Evento',
  demo: 'Demo',
  videollamada: 'Videollamada',
  llamada: 'Llamada',
  visita: 'Visita',
}

export const TIPOS_ACCION: readonly Enums<'tipo_accion'>[] = [
  'email',
  'llamada',
  'videollamada',
  'demo',
  'visita',
  'evento',
]

export const ETIQUETA_RESULTADO_ACCION: Readonly<Record<Enums<'resultado_accion'>, string>> = {
  positivo: 'Positivo',
  neutro: 'Neutro',
  negativo: 'Negativo',
  sin_respuesta: 'Sin respuesta',
}

export const RESULTADOS_ACCION: readonly Enums<'resultado_accion'>[] = [
  'positivo',
  'neutro',
  'negativo',
  'sin_respuesta',
]

/** El color acompana al texto del resultado, nunca lo reemplaza (rule `ui.md` §5). */
export const COLOR_RESULTADO_ACCION: Readonly<Record<Enums<'resultado_accion'>, string>> = {
  positivo: 'var(--positivo)',
  neutro: 'var(--neutro)',
  negativo: 'var(--negativo)',
  sin_respuesta: 'var(--aging-1-30)',
}

export const ETIQUETA_ESTADO_FACTURA: Readonly<Record<Enums<'estado_factura'>, string>> = {
  pendiente: 'Pendiente',
  parcial: 'Cobrada en parte',
  pagada: 'Pagada',
  vencida: 'Vencida',
  incobrable: 'Incobrable',
}

export const ESTADOS_FACTURA: readonly Enums<'estado_factura'>[] = [
  'pendiente',
  'parcial',
  'pagada',
  'vencida',
  'incobrable',
]

export const COLOR_ESTADO_FACTURA: Readonly<Record<Enums<'estado_factura'>, string>> = {
  pendiente: 'var(--aging-corriente)',
  parcial: 'var(--chart-3)',
  pagada: 'var(--positivo)',
  vencida: 'var(--aging-61-90)',
  incobrable: 'var(--aging-incobrable)',
}

export const ETIQUETA_ESTADO_CONTRATO: Readonly<Record<Enums<'estado_contrato'>, string>> = {
  activo: 'Activo',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
}

export const ETIQUETA_MOTIVO_BAJA: Readonly<Record<Enums<'motivo_baja'>, string>> = {
  impago: 'Impago',
  reestructuracion: 'Reestructuración',
  cambio_de_proveedor: 'Cambio de proveedor',
  cierre_de_operacion: 'Cierre de operación',
}

export const ETIQUETA_MONEDA: Readonly<Record<Enums<'moneda'>, string>> = {
  ARS: 'Pesos (ARS)',
  USD: 'Dólares (USD)',
}
