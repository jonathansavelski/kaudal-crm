/**
 * `/cuentas`: la tabla maestra de las 120 empresas.
 *
 * Filtros, orden, paginado y columnas visibles viven en la URL. El Excel exporta
 * **exactamente** el conjunto filtrado que el usuario esta mirando.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { estadoDePanel } from '@/components/charts/utilidades'
import { BarraTabla, ContadorFiltrados } from '@/components/comun/BarraFiltros'
import { armarChipsCuentas } from '@/components/cuentas/chips'
import { FiltrosCuentasCrm } from '@/components/cuentas/FiltrosCuentas'
import { COLUMNAS_CUENTAS, COLUMNAS_CUENTAS_OCULTAS } from '@/components/cuentas/columnas'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { BotonExportar } from '@/components/tabla/BotonExportar'
import { SelectorColumnas } from '@/components/tabla/SelectorColumnas'
import { TablaDatos } from '@/components/tabla/TablaDatos'
import { useTablaKaudal } from '@/components/tabla/nucleo'
import { Button } from '@/components/ui/button'
import { useCuentas } from '@/hooks/use-datos-crm'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'
import { hojaDeCuentas } from '@/lib/agregados/exportables'
import type { FilaCuenta, FiltrosCuentas } from '@/lib/agregados/cuentas'
import { filtrarCuentas, valoresUnicos } from '@/lib/agregados/cuentas'
import { formatearMesAnioGuion } from '@/lib/formato'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/cuentas')

/** Referencia estable para que el memo del filtrado no se recalcule mientras carga. */
const SIN_CUENTAS: FilaCuenta[] = []

const CLAVES: (keyof FiltrosCuentas)[] = [
  'busqueda',
  'estado',
  'sector',
  'tamanio',
  'provincia',
  'owner',
  'factMin',
  'factMax',
]

export default function Cuentas() {
  const hoy = useMemo(() => new Date(), [])
  const navegar = useNavigate()
  const url = useFiltrosUrl(CLAVES)
  const { cuentas, contexto, estado } = useCuentas(hoy)

  const filtros: FiltrosCuentas = url.valores
  const todas = cuentas ?? SIN_CUENTAS
  const filtradas = useMemo(() => filtrarCuentas(todas, filtros), [todas, filtros])
  const chips = armarChipsCuentas(filtros)

  const tabla = useTablaKaudal({
    columnas: COLUMNAS_CUENTAS,
    datos: filtradas,
    ordenPorDefecto: [{ id: 'facturacion12m', desc: true }],
    ocultasPorDefecto: COLUMNAS_CUENTAS_OCULTAS,
  })

  const mesBase = contexto ? formatearMesAnioGuion(contexto.mesBase) : ''

  return (
    <>
      <EncabezadoPagina
        titulo={ITEM.titulo}
        descripcion={
          contexto
            ? `Las cuentas de Nodus con sus métricas propias. La facturación real está expresada en pesos de ${mesBase}.`
            : ITEM.descripcion
        }
      />

      <TablaDatos
        tabla={tabla}
        estado={estadoDePanel({
          cargando: estado.cargando,
          error: estado.error,
          vacio: filtradas.length === 0,
        })}
        sustantivoPlural="cuentas"
        mensajeVacio={
          chips.length > 0
            ? 'Ninguna cuenta cumple los filtros. Probá ampliar el rango de facturación o quitar el filtro de provincia.'
            : 'Todavía no hay cuentas cargadas en el CRM. Corré el seed para poblar la base.'
        }
        accionVacio={
          chips.length > 0 ? (
            <Button variant="outline" size="sm" onClick={url.limpiar}>
              Limpiar filtros
            </Button>
          ) : null
        }
        onReintentar={estado.reintentar}
        onFilaClick={(fila) => navegar(`/cuentas/${fila.id}`)}
        etiquetaFila={(fila) => `Abrir la ficha de ${fila.razonSocial}`}
        barra={
          <BarraTabla
            filtros={
              <div className="min-w-0 flex-1">
                <FiltrosCuentasCrm
                  filtros={filtros}
                  provincias={valoresUnicos(todas, (cuenta) => cuenta.provincia)}
                  owners={valoresUnicos(todas, (cuenta) => cuenta.owner)}
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
                  nombreArchivo="kaudal-cuentas.xlsx"
                  cantidad={filtradas.length}
                  deshabilitado={estado.cargando || estado.error}
                  hojas={() => [hojaDeCuentas(filtradas, mesBase)]}
                />
              </>
            }
            chips={null}
            contador={
              <ContadorFiltrados
                filtradas={filtradas.length}
                total={todas.length}
                singular="cuenta"
                plural="cuentas"
                hayFiltros={chips.length > 0}
              />
            }
          />
        }
      />
    </>
  )
}
