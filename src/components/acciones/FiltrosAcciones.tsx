/**
 * Filtros de la tabla de acciones: tipo, resultado, campania y rango de fechas.
 * El estado vive en la URL; este componente solo lo pinta.
 */

import { CampoBusqueda, CampoFiltro, SelectorFiltro } from '@/components/comun/ControlesFiltro'
import { ChipsFiltros } from '@/components/comun/BarraFiltros'
import type { OpcionFiltro } from '@/components/comun/ControlesFiltro'
import type { ChipFiltro } from '@/components/comun/BarraFiltros'
import type { FiltrosAcciones } from '@/lib/agregados/acciones'
import {
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
  RESULTADOS_ACCION,
  TIPOS_ACCION,
} from '@/lib/etiquetas'

const OPCIONES_TIPO = TIPOS_ACCION.map((tipo) => ({
  valor: tipo,
  etiqueta: ETIQUETA_TIPO_ACCION[tipo],
}))

const OPCIONES_RESULTADO = RESULTADOS_ACCION.map((resultado) => ({
  valor: resultado,
  etiqueta: ETIQUETA_RESULTADO_ACCION[resultado],
}))

export function FiltrosAccionesComerciales({
  filtros,
  campanias,
  chips,
  onCambio,
  onLimpiar,
}: {
  filtros: FiltrosAcciones
  campanias: readonly OpcionFiltro[]
  chips: readonly ChipFiltro[]
  onCambio: (clave: keyof FiltrosAcciones, valor: string) => void
  onLimpiar: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Buscar</span>
          <CampoBusqueda
            id="buscar-acciones"
            valor={filtros.busqueda}
            onCambio={(valor) => onCambio('busqueda', valor)}
            placeholder="Cuenta, campaña, oportunidad o notas"
          />
        </div>

        <SelectorFiltro
          id="filtro-tipo-accion"
          etiqueta="Tipo"
          valor={filtros.tipo}
          opciones={OPCIONES_TIPO}
          onCambio={(valor) => onCambio('tipo', valor)}
        />
        <SelectorFiltro
          id="filtro-resultado"
          etiqueta="Resultado"
          valor={filtros.resultado}
          opciones={OPCIONES_RESULTADO}
          onCambio={(valor) => onCambio('resultado', valor)}
        />
        <SelectorFiltro
          id="filtro-campania"
          etiqueta="Campaña"
          valor={filtros.campania}
          opciones={campanias}
          textoTodos="Todas las campañas"
          onCambio={(valor) => onCambio('campania', valor)}
        />
        <div className="grid grid-cols-2 gap-2">
          <CampoFiltro
            id="filtro-desde"
            etiqueta="Desde"
            tipo="date"
            valor={filtros.desde}
            onCambio={(valor) => onCambio('desde', valor)}
          />
          <CampoFiltro
            id="filtro-hasta"
            etiqueta="Hasta"
            tipo="date"
            valor={filtros.hasta}
            onCambio={(valor) => onCambio('hasta', valor)}
          />
        </div>
      </div>

      <ChipsFiltros
        chips={chips}
        onQuitar={(clave) => onCambio(clave as keyof FiltrosAcciones, '')}
        onLimpiar={onLimpiar}
      />
    </div>
  )
}
