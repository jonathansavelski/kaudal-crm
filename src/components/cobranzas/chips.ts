/**
 * Chips de filtros activos de `/cobranzas`.
 *
 * Vive aparte del componente de filtros para que ese archivo exporte solo componentes
 * y para que el texto de cada chip se lea junto a las etiquetas de los enums.
 */

import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosCobranzas } from '@/lib/agregados/cobranzas'
import { ETIQUETA_BUCKET, ETIQUETA_ESTADO_FACTURA } from '@/lib/etiquetas'

export function armarChipsCobranzas(filtros: FiltrosCobranzas): ChipFiltro[] {
  const chips: ChipFiltro[] = []

  if (filtros.busqueda !== '') chips.push({ clave: 'busqueda', texto: `Texto: ${filtros.busqueda}` })
  if (filtros.bucket !== '') {
    chips.push({
      clave: 'bucket',
      texto: ETIQUETA_BUCKET[filtros.bucket as keyof typeof ETIQUETA_BUCKET] ?? filtros.bucket,
    })
  }
  if (filtros.estado !== '') {
    chips.push({
      clave: 'estado',
      texto: `Estado: ${ETIQUETA_ESTADO_FACTURA[filtros.estado as keyof typeof ETIQUETA_ESTADO_FACTURA] ?? filtros.estado}`,
    })
  }
  if (filtros.moneda !== '') chips.push({ clave: 'moneda', texto: `Moneda: ${filtros.moneda}` })
  if (filtros.soloPendientes === '1') {
    chips.push({ clave: 'soloPendientes', texto: 'Solo con saldo pendiente' })
  }

  return chips
}
