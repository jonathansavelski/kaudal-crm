/**
 * `/acciones`: toques comerciales y campanias. Dos tablas en la misma pantalla, cada una
 * con su propio orden y paginado en la URL (la de campanias usa el prefijo `camp`).
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { estadoDePanel } from '@/components/charts/utilidades'
import { BarraTabla, ContadorFiltrados } from '@/components/comun/BarraFiltros'
import { COLUMNAS_ACCIONES, COLUMNAS_ACCIONES_OCULTAS } from '@/components/acciones/columnas'
import { armarChipsAcciones } from '@/components/acciones/chips'
import { FiltrosAccionesComerciales } from '@/components/acciones/FiltrosAcciones'
import { PanelNuevaAccion } from '@/components/acciones/PanelNuevaAccion'
import { TablaCampanias } from '@/components/acciones/TablaCampanias'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { BotonExportar } from '@/components/tabla/BotonExportar'
import { SelectorColumnas } from '@/components/tabla/SelectorColumnas'
import { TablaDatos } from '@/components/tabla/TablaDatos'
import { useTablaKaudal } from '@/components/tabla/nucleo'
import { Button } from '@/components/ui/button'
import { useAcciones } from '@/hooks/use-datos-crm'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'
import { useCrearAccion } from '@/hooks/use-mutaciones-crm'
import type { FilaAccionVista, FilaCampaniaVista, FiltrosAcciones } from '@/lib/agregados/acciones'
import { filtrarAcciones } from '@/lib/agregados/acciones'
import { hojaDeAcciones } from '@/lib/agregados/exportables'
import { mensajeDeError } from '@/lib/errores'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/acciones')

/** Referencias estables para que los memos no se recalculen mientras carga. */
const SIN_ACCIONES: FilaAccionVista[] = []
const SIN_CAMPANIAS: FilaCampaniaVista[] = []

const CLAVES: (keyof FiltrosAcciones)[] = [
  'busqueda',
  'tipo',
  'resultado',
  'campania',
  'desde',
  'hasta',
]

export default function Acciones() {
  const hoy = useMemo(() => new Date(), [])
  const navegar = useNavigate()
  const url = useFiltrosUrl(CLAVES)
  const [panelAbierto, setPanelAbierto] = useState(false)

  const { datos, filas, estado } = useAcciones(hoy)
  const crearAccion = useCrearAccion()

  const filtros: FiltrosAcciones = url.valores
  const todas = datos?.acciones ?? SIN_ACCIONES
  const campanias = datos?.campanias ?? SIN_CAMPANIAS
  const filtradas = useMemo(() => filtrarAcciones(todas, filtros), [todas, filtros])

  const nombreCampania = (id: string) =>
    id === 'sin'
      ? 'Sin campaña'
      : (campanias.find((campania) => campania.id === id)?.nombre ?? 'Campaña dada de baja')

  const chips = armarChipsAcciones(filtros, nombreCampania)

  const opcionesCampania = [
    { valor: 'sin', etiqueta: 'Sin campaña' },
    ...campanias.map((campania) => ({ valor: campania.id, etiqueta: campania.nombre })),
  ]

  const tabla = useTablaKaudal({
    columnas: COLUMNAS_ACCIONES,
    datos: filtradas,
    ordenPorDefecto: [{ id: 'fecha', desc: true }],
    ocultasPorDefecto: COLUMNAS_ACCIONES_OCULTAS,
  })

  return (
    <>
      <EncabezadoPagina
        titulo={ITEM.titulo}
        descripcion="Toques comerciales y campañas. Los costos van en pesos nominales, llevados a ARS al MEP venta de la fecha de cada acción."
        acciones={
          <Button size="sm" onClick={() => setPanelAbierto(true)}>
            <Plus className="size-4" aria-hidden />
            Nueva acción
          </Button>
        }
      />

      <div className="space-y-8">
        <section className="min-w-0 space-y-2">
          <h2 className="text-base font-semibold">Acciones comerciales</h2>

          <TablaDatos
            tabla={tabla}
            estado={estadoDePanel({
              cargando: estado.cargando,
              error: estado.error,
              vacio: filtradas.length === 0,
            })}
            sustantivoPlural="acciones"
            mensajeVacio={
              chips.length > 0
                ? 'Ninguna acción cumple los filtros. Probá ampliar el rango de fechas o quitar el filtro de campaña.'
                : 'Todavía no hay acciones comerciales cargadas. Cargá la primera para que empiece a computar en el CAC del canal.'
            }
            accionVacio={
              chips.length > 0 ? (
                <Button variant="outline" size="sm" onClick={url.limpiar}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={() => setPanelAbierto(true)}>
                  <Plus className="size-4" aria-hidden />
                  Nueva acción
                </Button>
              )
            }
            onReintentar={estado.reintentar}
            onFilaClick={(fila) => navegar(`/cuentas/${fila.empresaId}`)}
            etiquetaFila={(fila) => `Abrir la ficha de ${fila.razonSocial}`}
            barra={
              <BarraTabla
                filtros={
                  <div className="min-w-0 flex-1">
                    <FiltrosAccionesComerciales
                      filtros={filtros}
                      campanias={opcionesCampania}
                      chips={chips}
                      onCambio={(clave, valor) => url.fijar(clave, valor)}
                      onLimpiar={url.limpiar}
                    />
                  </div>
                }
                acciones={
                  <>
                    <SelectorColumnas tabla={tabla} />
                    <BotonExportar
                      nombreArchivo="kaudal-acciones.xlsx"
                      cantidad={filtradas.length}
                      deshabilitado={estado.cargando || estado.error}
                      hojas={() => [hojaDeAcciones(filtradas)]}
                    />
                  </>
                }
                chips={null}
                contador={
                  <ContadorFiltrados
                    filtradas={filtradas.length}
                    total={todas.length}
                    singular="acción"
                    plural="acciones"
                    hayFiltros={chips.length > 0}
                  />
                }
              />
            }
          />
        </section>

        <TablaCampanias
          campanias={campanias}
          cargando={estado.cargando}
          error={estado.error}
          onReintentar={estado.reintentar}
        />
      </div>

      <PanelNuevaAccion
        abierto={panelAbierto}
        hoy={hoy}
        empresas={filas?.empresas ?? []}
        contactos={filas?.contactos ?? []}
        oportunidades={filas?.oportunidades ?? []}
        campanias={filas?.campanias ?? []}
        guardando={crearAccion.isPending}
        errorGuardado={mensajeDeError(crearAccion.error)}
        onGuardar={(datos) =>
          crearAccion.mutate(datos, { onSuccess: () => setPanelAbierto(false) })
        }
        onCerrar={() => setPanelAbierto(false)}
      />
    </>
  )
}
