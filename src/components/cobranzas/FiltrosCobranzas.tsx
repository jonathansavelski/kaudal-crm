/**
 * Filtros de la tabla de facturas de `/cobranzas`. El bucket lo puede fijar tambien el
 * drill-down del grafico: es el mismo parametro de URL.
 */

import { CampoBusqueda, SelectorFiltro } from '@/components/comun/ControlesFiltro'
import { ChipsFiltros } from '@/components/comun/BarraFiltros'
import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosCobranzas } from '@/lib/agregados/cobranzas'
import {
  ESTADOS_FACTURA,
  ETIQUETA_BUCKET,
  ETIQUETA_ESTADO_FACTURA,
  ETIQUETA_MONEDA,
} from '@/lib/etiquetas'
import { BUCKETS_AGING } from '@/lib/metricas/tipos'

const OPCIONES_BUCKET = BUCKETS_AGING.map((bucket) => ({
  valor: bucket,
  etiqueta: ETIQUETA_BUCKET[bucket],
}))

const OPCIONES_ESTADO = ESTADOS_FACTURA.map((estado) => ({
  valor: estado,
  etiqueta: ETIQUETA_ESTADO_FACTURA[estado],
}))

const OPCIONES_MONEDA = (['ARS', 'USD'] as const).map((moneda) => ({
  valor: moneda,
  etiqueta: ETIQUETA_MONEDA[moneda],
}))

const OPCIONES_PENDIENTES = [{ valor: '1', etiqueta: 'Solo las que tienen saldo' }]

export function FiltrosCobranzasCartera({
  filtros,
  chips,
  onCambio,
  onLimpiar,
}: {
  filtros: FiltrosCobranzas
  chips: readonly ChipFiltro[]
  onCambio: (clave: keyof FiltrosCobranzas, valor: string) => void
  onLimpiar: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Buscar</span>
          <CampoBusqueda
            id="buscar-facturas"
            valor={filtros.busqueda}
            onCambio={(valor) => onCambio('busqueda', valor)}
            placeholder="Número de factura o razón social"
          />
        </div>

        <SelectorFiltro
          id="filtro-bucket"
          etiqueta="Antigüedad"
          valor={filtros.bucket}
          opciones={OPCIONES_BUCKET}
          onCambio={(valor) => onCambio('bucket', valor)}
        />
        <SelectorFiltro
          id="filtro-estado-factura"
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          onCambio={(valor) => onCambio('estado', valor)}
        />
        <SelectorFiltro
          id="filtro-moneda"
          etiqueta="Moneda"
          valor={filtros.moneda}
          opciones={OPCIONES_MONEDA}
          onCambio={(valor) => onCambio('moneda', valor)}
        />
        <SelectorFiltro
          id="filtro-pendientes"
          etiqueta="Saldo"
          valor={filtros.soloPendientes}
          opciones={OPCIONES_PENDIENTES}
          textoTodos="Todas las facturas"
          onCambio={(valor) => onCambio('soloPendientes', valor)}
        />
      </div>

      <ChipsFiltros
        chips={chips}
        onQuitar={(clave) => onCambio(clave as keyof FiltrosCobranzas, '')}
        onLimpiar={onLimpiar}
      />
    </div>
  )
}
