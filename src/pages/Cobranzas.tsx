/**
 * `/cobranzas`: aging con drill-down, DSO, VAN de la cartera y provision por incobrables.
 *
 * El bucket seleccionado, los filtros, la tasa de descuento, el orden y el paginado viven
 * en la URL: el link reproduce exactamente la misma vista, con la misma tasa.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { estadoDePanel } from '@/components/charts/utilidades'
import { BarraTabla, ContadorFiltrados } from '@/components/comun/BarraFiltros'
import { COLUMNAS_COBRANZAS, COLUMNAS_COBRANZAS_OCULTAS } from '@/components/cobranzas/columnas'
import { armarChipsCobranzas } from '@/components/cobranzas/chips'
import { FiltrosCobranzasCartera } from '@/components/cobranzas/FiltrosCobranzas'
import { GraficoAgingDrill } from '@/components/cobranzas/GraficoAgingDrill'
import { PanelVan } from '@/components/cobranzas/PanelVan'
import { ResumenCobranzas } from '@/components/cobranzas/ResumenCobranzas'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { BotonExportar } from '@/components/tabla/BotonExportar'
import { SelectorColumnas } from '@/components/tabla/SelectorColumnas'
import { TablaDatos } from '@/components/tabla/TablaDatos'
import { useTablaKaudal } from '@/components/tabla/nucleo'
import { Button } from '@/components/ui/button'
import { useCobranzas } from '@/hooks/use-datos-crm'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'
import { useTasasPlazoFijo } from '@/hooks/use-macro'
import type { FilaCobranza, FiltrosCobranzas } from '@/lib/agregados/cobranzas'
import { filtrarCobranzas } from '@/lib/agregados/cobranzas'
import { hojaDeCobranzas } from '@/lib/agregados/exportables'
import { formatearImporte, formatearMesAnioGuion } from '@/lib/formato'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/cobranzas')

/** TNA de respaldo si el API de tasas no responde. Editable desde la pantalla. */
const TNA_RESPALDO_PCT = 30

const PARAM_TNA = 'tna'

const CLAVES = ['busqueda', 'bucket', 'estado', 'moneda', 'soloPendientes', PARAM_TNA] as const

/** Referencia estable para que el memo del filtrado no se recalcule mientras carga. */
const SIN_FACTURAS: FilaCobranza[] = []

export default function Cobranzas() {
  const hoy = useMemo(() => new Date(), [])
  const navegar = useNavigate()
  const url = useFiltrosUrl(CLAVES)
  const tasas = useTasasPlazoFijo()

  // La mejor TNA ofrecida es el costo de oportunidad de tener la plata en una factura.
  const tnaDelMercadoPct = tasas.data?.[0] ? tasas.data[0].tna * 100 : null
  const tnaPct = url.leerNumero(PARAM_TNA, tnaDelMercadoPct ?? TNA_RESPALDO_PCT)

  const { datos, contexto, estado } = useCobranzas(Math.max(0, tnaPct) / 100, hoy)

  const filtros: FiltrosCobranzas = url.valores
  const todas = datos?.filas ?? SIN_FACTURAS
  const filtradas = useMemo(() => filtrarCobranzas(todas, filtros), [todas, filtros])
  const chips = armarChipsCobranzas(filtros)
  const mesBase = contexto ? formatearMesAnioGuion(contexto.mesBase) : ''

  const tabla = useTablaKaudal({
    columnas: COLUMNAS_COBRANZAS,
    datos: filtradas,
    ordenPorDefecto: [{ id: 'saldoArs', desc: true }],
    ocultasPorDefecto: COLUMNAS_COBRANZAS_OCULTAS,
  })

  const limpiarFiltros = () =>
    url.fijarVarias({ busqueda: '', bucket: '', estado: '', moneda: '', soloPendientes: '' })

  return (
    <>
      <EncabezadoPagina
        titulo={ITEM.titulo}
        descripcion={
          contexto
            ? `Cartera por cobrar de Nodus. Los importes en pesos de ${mesBase} reexpresan cada saldo al poder adquisitivo del mes en que se facturó; los importes en USD se llevaron a pesos al MEP venta de la fecha de emisión de cada factura.`
            : ITEM.descripcion
        }
      />

      <div className="space-y-6">
        <ResumenCobranzas
          datos={datos}
          mesBase={mesBase}
          cargando={estado.cargando || estado.error}
        />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <GraficoAgingDrill
            porciones={datos?.aging ?? []}
            seleccionado={filtros.bucket}
            estado={estadoDePanel({
              cargando: estado.cargando,
              error: estado.error,
              vacio: (datos?.aging ?? []).every((porcion) => porcion.saldoCentavos === 0),
            })}
            onSeleccionar={(bucket) => url.fijar('bucket', bucket)}
            onReintentar={estado.reintentar}
          />

          <PanelVan
            datos={datos}
            tnaPct={tnaPct}
            tnaDelMercado={tnaDelMercadoPct}
            entidad={tasas.data?.[0]?.entidad ?? null}
            cargandoTasa={tasas.isPending}
            errorTasa={tasas.isError}
            cargando={estado.cargando || estado.error}
            onTna={(valor) => url.fijar(PARAM_TNA, valor)}
            onReiniciarTna={() => url.fijar(PARAM_TNA, '')}
          />
        </div>

        <TablaDatos
          tabla={tabla}
          estado={estadoDePanel({
            cargando: estado.cargando,
            error: estado.error,
            vacio: filtradas.length === 0,
          })}
          sustantivoPlural="facturas"
          mensajeVacio={
            chips.length > 0
              ? 'Ninguna factura cumple los filtros. Probá quitar el bucket de antigüedad o el filtro de estado.'
              : 'No hay facturas cargadas. Corré el seed para poblar la base.'
          }
          accionVacio={
            chips.length > 0 ? (
              <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : null
          }
          onReintentar={estado.reintentar}
          onFilaClick={(fila) => navegar(`/cuentas/${fila.empresaId}`)}
          etiquetaFila={(fila) => `Abrir la ficha de ${fila.razonSocial}`}
          barra={
            <BarraTabla
              filtros={
                <div className="min-w-0 flex-1">
                  <FiltrosCobranzasCartera
                    filtros={filtros}
                    chips={chips}
                    onCambio={(clave, valor) => url.fijar(clave, valor)}
                    onLimpiar={limpiarFiltros}
                  />
                </div>
              }
              acciones={
                <>
                  <SelectorColumnas tabla={tabla} />
                  <BotonExportar
                    nombreArchivo="kaudal-cobranzas.xlsx"
                    cantidad={filtradas.length}
                    deshabilitado={estado.cargando || estado.error}
                    hojas={() => [hojaDeCobranzas(filtradas, mesBase)]}
                  />
                </>
              }
              chips={null}
              contador={
                <ContadorFiltrados
                  filtradas={filtradas.length}
                  total={todas.length}
                  singular="factura"
                  plural="facturas"
                  hayFiltros={chips.length > 0}
                />
              }
            />
          }
          pie={
            datos ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Ventas a crédito de los últimos 12 meses:{' '}
                {formatearImporte(datos.ventas12mCentavos)} nominales. Es el denominador del DSO.
              </p>
            ) : null
          }
        />
      </div>
    </>
  )
}
