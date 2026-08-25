/**
 * Las rutas de Kaudal, en un solo lugar: el sidebar las pinta y las paginas las usan
 * para su titulo. Si el `h1` de la pantalla y el item del sidebar coinciden, es porque
 * salen de la misma constante (rule `ui.md` §6).
 */

import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Handshake,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Workflow,
} from 'lucide-react'

export type ItemNavegacion = {
  ruta: string
  titulo: string
  descripcion: string
  icono: LucideIcon
}

export const NAVEGACION: readonly ItemNavegacion[] = [
  {
    ruta: '/',
    titulo: 'Dashboard',
    descripcion: 'MRR, pipeline ponderado, DSO, cartera y riesgo, en valor nominal y real.',
    icono: LayoutDashboard,
  },
  {
    ruta: '/pipeline',
    titulo: 'Pipeline',
    descripcion: 'Oportunidades por etapa, total ponderado y forecast a 3 y 6 meses.',
    icono: Workflow,
  },
  {
    ruta: '/cuentas',
    titulo: 'Cuentas',
    descripcion: 'Las 120 empresas de la cartera, con filtros, orden y exportación a Excel.',
    icono: Building2,
  },
  {
    ruta: '/cobranzas',
    titulo: 'Cobranzas',
    descripcion: 'Aging de la cartera, DSO, VAN a la tasa del mercado y provisión por incobrables.',
    icono: Receipt,
  },
  {
    ruta: '/acciones',
    titulo: 'Acciones',
    descripcion: 'Acciones comerciales y campañas, con presupuesto, atribución y ROI.',
    icono: Handshake,
  },
  {
    ruta: '/mercado',
    titulo: 'Mercado',
    descripcion: 'Cotizaciones, inflación, tasas y el simulador de escenarios MEP e IPC.',
    icono: TrendingUp,
  },
]

/** Busca el item de una ruta. Falla temprano si alguien inventa una ruta que no existe. */
export function itemDeRuta(ruta: string): ItemNavegacion {
  const item = NAVEGACION.find((candidato) => candidato.ruta === ruta)
  if (!item) throw new Error(`Ruta no declarada en NAVEGACION: ${ruta}`)

  return item
}
