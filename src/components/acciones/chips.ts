/**
 * Chips de filtros activos de `/acciones`.
 *
 * Vive aparte del componente de filtros para que ese archivo exporte solo componentes
 * y para que el texto de cada chip se lea junto a las etiquetas de los enums.
 */

import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosAcciones } from '@/lib/agregados/acciones'
import { ETIQUETA_RESULTADO_ACCION, ETIQUETA_TIPO_ACCION } from '@/lib/etiquetas'
import { formatearFecha } from '@/lib/formato'

export function armarChipsAcciones(
  filtros: FiltrosAcciones,
  nombreCampania: (id: string) => string,
): ChipFiltro[] {
  const chips: ChipFiltro[] = []

  if (filtros.busqueda !== '') chips.push({ clave: 'busqueda', texto: `Texto: ${filtros.busqueda}` })
  if (filtros.tipo !== '') {
    chips.push({
      clave: 'tipo',
      texto: `Tipo: ${ETIQUETA_TIPO_ACCION[filtros.tipo as keyof typeof ETIQUETA_TIPO_ACCION] ?? filtros.tipo}`,
    })
  }
  if (filtros.resultado !== '') {
    chips.push({
      clave: 'resultado',
      texto: `Resultado: ${ETIQUETA_RESULTADO_ACCION[filtros.resultado as keyof typeof ETIQUETA_RESULTADO_ACCION] ?? filtros.resultado}`,
    })
  }
  if (filtros.campania !== '') {
    chips.push({ clave: 'campania', texto: `Campaña: ${nombreCampania(filtros.campania)}` })
  }
  if (filtros.desde !== '') {
    chips.push({ clave: 'desde', texto: `Desde ${formatearFecha(filtros.desde)}` })
  }
  if (filtros.hasta !== '') {
    chips.push({ clave: 'hasta', texto: `Hasta ${formatearFecha(filtros.hasta)}` })
  }

  return chips
}
