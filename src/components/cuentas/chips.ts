/**
 * Chips de filtros activos de `/cuentas`.
 *
 * Vive aparte del componente de filtros para que el archivo de filtros exporte solo
 * componentes (lint `react/only-export-components`) y para que el texto de cada chip se
 * pueda leer de un vistazo, junto con las etiquetas de los enums.
 */

import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosCuentas } from '@/lib/agregados/cuentas'
import { ETIQUETA_ESTADO_COMERCIAL, ETIQUETA_SECTOR, ETIQUETA_TAMANIO } from '@/lib/etiquetas'
import { formatearImporte } from '@/lib/formato'

function chipMonto(prefijo: string, pesos: string): string {
  const valor = Number(pesos)
  return Number.isFinite(valor)
    ? `${prefijo} ${formatearImporte(Math.round(valor * 100))}`
    : `${prefijo} ${pesos}`
}

export function armarChipsCuentas(filtros: FiltrosCuentas): ChipFiltro[] {
  const chips: ChipFiltro[] = []

  if (filtros.busqueda !== '') chips.push({ clave: 'busqueda', texto: `Texto: ${filtros.busqueda}` })
  if (filtros.estado !== '') {
    chips.push({
      clave: 'estado',
      texto: `Estado: ${ETIQUETA_ESTADO_COMERCIAL[filtros.estado as keyof typeof ETIQUETA_ESTADO_COMERCIAL] ?? filtros.estado}`,
    })
  }
  if (filtros.sector !== '') {
    chips.push({
      clave: 'sector',
      texto: `Sector: ${ETIQUETA_SECTOR[filtros.sector as keyof typeof ETIQUETA_SECTOR] ?? filtros.sector}`,
    })
  }
  if (filtros.tamanio !== '') {
    chips.push({
      clave: 'tamanio',
      texto: `Tamaño: ${ETIQUETA_TAMANIO[filtros.tamanio as keyof typeof ETIQUETA_TAMANIO] ?? filtros.tamanio}`,
    })
  }
  if (filtros.provincia !== '') chips.push({ clave: 'provincia', texto: `Provincia: ${filtros.provincia}` })
  if (filtros.owner !== '') chips.push({ clave: 'owner', texto: `Owner: ${filtros.owner}` })
  if (filtros.factMin !== '') chips.push({ clave: 'factMin', texto: chipMonto('Facturó desde', filtros.factMin) })
  if (filtros.factMax !== '') chips.push({ clave: 'factMax', texto: chipMonto('Facturó hasta', filtros.factMax) })

  return chips
}
