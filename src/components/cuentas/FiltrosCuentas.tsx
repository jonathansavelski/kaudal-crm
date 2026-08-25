/**
 * Los seis filtros de `/cuentas` mas el buscador. Presentacional: el estado vive en la
 * URL y lo maneja la pagina.
 */

import { CampoBusqueda, CampoFiltro, SelectorFiltro } from '@/components/comun/ControlesFiltro'
import { ChipsFiltros } from '@/components/comun/BarraFiltros'
import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosCuentas } from '@/lib/agregados/cuentas'
import {
  ESTADOS_COMERCIALES,
  ETIQUETA_ESTADO_COMERCIAL,
  ETIQUETA_SECTOR,
  ETIQUETA_TAMANIO,
} from '@/lib/etiquetas'

const OPCIONES_ESTADO = ESTADOS_COMERCIALES.map((estado) => ({
  valor: estado,
  etiqueta: ETIQUETA_ESTADO_COMERCIAL[estado],
}))

const OPCIONES_SECTOR = Object.entries(ETIQUETA_SECTOR).map(([valor, etiqueta]) => ({
  valor,
  etiqueta,
}))

const OPCIONES_TAMANIO = (['micro', 'pyme', 'corporativa'] as const).map((tamanio) => ({
  valor: tamanio,
  etiqueta: ETIQUETA_TAMANIO[tamanio],
}))

export function FiltrosCuentasCrm({
  filtros,
  provincias,
  owners,
  chips,
  onCambio,
  onLimpiar,
}: {
  filtros: FiltrosCuentas
  provincias: readonly string[]
  owners: readonly string[]
  chips: readonly ChipFiltro[]
  onCambio: (clave: keyof FiltrosCuentas, valor: string) => void
  onLimpiar: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Buscar</span>
          <CampoBusqueda
            id="buscar-cuentas"
            valor={filtros.busqueda}
            onCambio={(valor) => onCambio('busqueda', valor)}
            placeholder="Razón social, CUIT, ciudad u owner"
          />
        </div>

        <SelectorFiltro
          id="filtro-estado"
          etiqueta="Estado comercial"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          onCambio={(valor) => onCambio('estado', valor)}
        />
        <SelectorFiltro
          id="filtro-sector"
          etiqueta="Sector"
          valor={filtros.sector}
          opciones={OPCIONES_SECTOR}
          onCambio={(valor) => onCambio('sector', valor)}
        />
        <SelectorFiltro
          id="filtro-tamanio"
          etiqueta="Tamaño"
          valor={filtros.tamanio}
          opciones={OPCIONES_TAMANIO}
          onCambio={(valor) => onCambio('tamanio', valor)}
        />
        <SelectorFiltro
          id="filtro-provincia"
          etiqueta="Provincia"
          valor={filtros.provincia}
          opciones={provincias.map((provincia) => ({ valor: provincia, etiqueta: provincia }))}
          onCambio={(valor) => onCambio('provincia', valor)}
        />
        <SelectorFiltro
          id="filtro-owner-cuenta"
          etiqueta="Owner comercial"
          valor={filtros.owner}
          opciones={owners.map((owner) => ({ valor: owner, etiqueta: owner }))}
          onCambio={(valor) => onCambio('owner', valor)}
        />
        <div className="grid grid-cols-2 gap-2">
          <CampoFiltro
            id="filtro-fact-min"
            etiqueta="Facturó desde ($)"
            tipo="number"
            valor={filtros.factMin}
            placeholder="0"
            onCambio={(valor) => onCambio('factMin', valor)}
          />
          <CampoFiltro
            id="filtro-fact-max"
            etiqueta="Hasta ($)"
            tipo="number"
            valor={filtros.factMax}
            placeholder="sin tope"
            onCambio={(valor) => onCambio('factMax', valor)}
          />
        </div>
      </div>

      <ChipsFiltros
        chips={chips}
        onQuitar={(clave) => onCambio(clave as keyof FiltrosCuentas, '')}
        onLimpiar={onLimpiar}
      />
    </div>
  )
}
