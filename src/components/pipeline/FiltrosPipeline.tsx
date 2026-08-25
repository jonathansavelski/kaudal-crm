/**
 * Filtros de `/pipeline`. El estado vive en la URL; este componente solo lo pinta y
 * avisa los cambios.
 *
 * Los filtros activos se muestran como chips removibles, no escondidos (rule `ui.md` §6).
 */

import { CampoFiltro, SelectorFiltro } from '@/components/comun/ControlesFiltro'
import { ChipsFiltros, ContadorFiltrados } from '@/components/comun/BarraFiltros'
import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import { ETIQUETA_CANAL, ETIQUETA_TIPO_OPORTUNIDAD } from '@/lib/etiquetas'
import type { FiltrosPipeline } from '@/lib/agregados/pipeline'
import { formatearImporte } from '@/lib/formato'
import { CANALES } from '@/lib/metricas/tipos'

const OPCIONES_ORIGEN = CANALES.map((canal) => ({
  valor: canal,
  etiqueta: ETIQUETA_CANAL[canal],
}))

const OPCIONES_TIPO = (['implementacion', 'expansion'] as const).map((tipo) => ({
  valor: tipo,
  etiqueta: ETIQUETA_TIPO_OPORTUNIDAD[tipo],
}))

function chipMonto(etiqueta: string, pesos: string): string {
  const valor = Number(pesos)
  return Number.isFinite(valor)
    ? `${etiqueta} ${formatearImporte(Math.round(valor * 100))}`
    : `${etiqueta} ${pesos}`
}

export function FiltrosPipelineComercial({
  filtros,
  owners,
  cantidad,
  total,
  cargando,
  error,
  onCambio,
  onLimpiar,
}: {
  filtros: FiltrosPipeline
  owners: readonly string[]
  cantidad: number
  total: number
  cargando: boolean
  error: boolean
  onCambio: (clave: keyof FiltrosPipeline, valor: string) => void
  onLimpiar: () => void
}) {
  const chips: ChipFiltro[] = []
  if (filtros.owner !== '') chips.push({ clave: 'owner', texto: `Owner: ${filtros.owner}` })
  if (filtros.origen !== '') {
    chips.push({
      clave: 'origen',
      texto: `Origen: ${ETIQUETA_CANAL[filtros.origen as keyof typeof ETIQUETA_CANAL] ?? filtros.origen}`,
    })
  }
  if (filtros.tipo !== '') {
    chips.push({
      clave: 'tipo',
      texto: `Tipo: ${ETIQUETA_TIPO_OPORTUNIDAD[filtros.tipo as keyof typeof ETIQUETA_TIPO_OPORTUNIDAD] ?? filtros.tipo}`,
    })
  }
  if (filtros.montoMin !== '') {
    chips.push({ clave: 'montoMin', texto: chipMonto('Desde', filtros.montoMin) })
  }
  if (filtros.montoMax !== '') {
    chips.push({ clave: 'montoMax', texto: chipMonto('Hasta', filtros.montoMax) })
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SelectorFiltro
          id="filtro-owner"
          etiqueta="Owner comercial"
          valor={filtros.owner}
          opciones={owners.map((owner) => ({ valor: owner, etiqueta: owner }))}
          onCambio={(valor) => onCambio('owner', valor)}
        />
        <SelectorFiltro
          id="filtro-origen"
          etiqueta="Origen"
          valor={filtros.origen}
          opciones={OPCIONES_ORIGEN}
          onCambio={(valor) => onCambio('origen', valor)}
        />
        <SelectorFiltro
          id="filtro-tipo"
          etiqueta="Tipo"
          valor={filtros.tipo}
          opciones={OPCIONES_TIPO}
          onCambio={(valor) => onCambio('tipo', valor)}
        />
        <CampoFiltro
          id="filtro-monto-min"
          etiqueta="Monto desde ($)"
          tipo="number"
          valor={filtros.montoMin}
          placeholder="0"
          onCambio={(valor) => onCambio('montoMin', valor)}
        />
        <CampoFiltro
          id="filtro-monto-max"
          etiqueta="Monto hasta ($)"
          tipo="number"
          valor={filtros.montoMax}
          placeholder="sin tope"
          onCambio={(valor) => onCambio('montoMax', valor)}
        />
      </div>

      <ChipsFiltros
        chips={chips}
        onQuitar={(clave) => onCambio(clave as keyof FiltrosPipeline, '')}
        onLimpiar={onLimpiar}
      />

      <ContadorFiltrados
        filtradas={cantidad}
        total={total}
        singular="oportunidad abierta"
        plural="oportunidades abiertas"
        hayFiltros={chips.length > 0}
        cargando={cargando}
        error={error}
      />
    </div>
  )
}
