/**
 * `/pipeline`: el embudo comercial por etapa, con forecast y panel de detalle.
 *
 * El contenedor hace el fetching y arma props; los hijos son presentacionales
 * (rule `stack.md` §2). Los filtros y la oportunidad abierta viven en la URL: si alguien
 * manda el link, llega a la misma vista con el mismo panel abierto.
 */

import { useMemo, useState } from 'react'

import { estadoDePanel } from '@/components/charts/utilidades'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { FiltrosPipelineComercial } from '@/components/pipeline/FiltrosPipeline'
import { PanelOportunidad } from '@/components/pipeline/PanelOportunidad'
import { ResumenPipeline } from '@/components/pipeline/ResumenPipeline'
import { TableroPipeline } from '@/components/pipeline/TableroPipeline'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'
import { usePipeline } from '@/hooks/use-datos-crm'
import { accionesDeOportunidad } from '@/lib/agregados/pipeline'
import type { FiltrosPipeline, OportunidadVista } from '@/lib/agregados/pipeline'
import { formatearCantidad } from '@/lib/formato'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/pipeline')

const CLAVES: (keyof FiltrosPipeline)[] = ['owner', 'origen', 'tipo', 'montoMin', 'montoMax']

export default function Pipeline() {
  const hoy = useMemo(() => new Date(), [])
  const url = useFiltrosUrl(CLAVES)
  const [abierta, setAbierta] = useState<OportunidadVista | null>(null)

  const filtros: FiltrosPipeline = url.valores

  const { datos, acciones, contexto, estado } = usePipeline(filtros, hoy)

  const estadoTablero = estadoDePanel({
    cargando: estado.cargando,
    error: estado.error,
    vacio: (datos?.cantidad ?? 0) === 0,
  })

  return (
    <>
      <EncabezadoPagina
        titulo={ITEM.titulo}
        descripcion="Oportunidades abiertas por etapa. Los montos van en pesos nominales; los que se pactaron en dólares se valúan al último MEP venta conocido."
      />

      <div className="space-y-6">
        <ResumenPipeline
          datos={datos}
          fechaMep={contexto?.fechaMepUltimo}
          cargando={estado.cargando || estado.error}
        />

        <FiltrosPipelineComercial
          filtros={filtros}
          owners={datos?.owners ?? []}
          cantidad={datos?.cantidad ?? 0}
          total={datos?.cantidadSinFiltrar ?? 0}
          onCambio={(clave, valor) => url.fijar(clave, valor)}
          onLimpiar={url.limpiar}
        />

        {datos && datos.sinCotizacion > 0 ? (
          <p className="text-sm text-muted-foreground">
            {formatearCantidad(datos.sinCotizacion)} oportunidades quedaron fuera de los totales:
            no hay cotización MEP con la cual llevarlas a pesos.
          </p>
        ) : null}

        <TableroPipeline
          columnas={datos?.columnas ?? []}
          estado={estadoTablero}
          hayFiltros={url.cantidadActivos > 0}
          onLimpiarFiltros={url.limpiar}
          onReintentar={estado.reintentar}
          onAbrir={setAbierta}
        />
      </div>

      <PanelOportunidad
        oportunidad={abierta}
        acciones={abierta ? accionesDeOportunidad(acciones, abierta.id) : []}
        onCerrar={() => setAbierta(null)}
      />
    </>
  )
}
