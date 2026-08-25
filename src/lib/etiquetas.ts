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
