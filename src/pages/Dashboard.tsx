/**
 * Dashboard financiero: seis KPI y seis graficos sobre las mismas filas.
 *
 * El contenedor hace el fetching y arma props; los hijos son presentacionales y reciben
 * datos ya calculados por `armarDashboard` (rule `stack.md` §2 y §3).
 */

import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'

import { estadoDePanel } from '@/components/charts/utilidades'
import { FilaKpis } from '@/components/dashboard/FilaKpis'
import { GraficoAging } from '@/components/dashboard/GraficoAging'
import { GraficoCacLtv } from '@/components/dashboard/GraficoCacLtv'
import { GraficoEmbudo } from '@/components/dashboard/GraficoEmbudo'
import { GraficoEvolucion } from '@/components/dashboard/GraficoEvolucion'
import { GraficoSectores } from '@/components/dashboard/GraficoSectores'
import { GraficoTopClientes } from '@/components/dashboard/GraficoTopClientes'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { useDatosDashboard } from '@/hooks/use-datos-dashboard'
import { formatearCantidad, formatearFecha, formatearMesAnioGuion } from '@/lib/formato'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/')

export default function Dashboard() {
  const hoy = useMemo(() => new Date(), [])
  const { datos, isPending, isError, refetch } = useDatosDashboard(hoy)

  const reintentar = () => {
    void refetch()
  }

  const estado = (vacio: boolean) =>
    estadoDePanel({ cargando: isPending, error: isError, vacio: !isError && !isPending && vacio })

  const contexto = datos?.contexto

  return (
    <>
      <EncabezadoPagina
        titulo={ITEM.titulo}
        descripcion={
          contexto
            ? `Valor real expresado en pesos de ${formatearMesAnioGuion(contexto.mesBase)}. Importes en USD llevados a pesos al MEP venta de la fecha de cada operación.`
            : ITEM.descripcion
        }
      />

      <div className="space-y-6">
        <FilaKpis kpis={datos?.kpis} contexto={contexto} cargando={isPending || isError} />

        {isError ? (
          <p className="flex items-center gap-2 rounded-md border border-negativo/40 bg-negativo/5 px-3 py-2 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-negativo" aria-hidden />
            No pudimos traer los datos del CRM. Cada panel ofrece reintentar.
          </p>
        ) : null}

        {datos && datos.facturasSinCotizacion > 0 ? (
          <p className="text-sm text-muted-foreground">
            {formatearCantidad(datos.facturasSinCotizacion)} facturas en USD quedaron fuera de los
            totales: no hay cotización MEP para su fecha de emisión.
          </p>
        ) : null}

        <GraficoEvolucion
          serie={datos?.serie ?? []}
          mesBase={contexto?.mesBase}
          estado={estado((datos?.serie.length ?? 0) === 0)}
          onReintentar={reintentar}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <GraficoEmbudo
            tramos={datos?.embudo ?? []}
            estado={estado(
              (datos?.embudo ?? []).every((tramo) => tramo.cantidad === 0),
            )}
            onReintentar={reintentar}
          />

          <GraficoAging
            porciones={datos?.aging ?? []}
            estado={estado(
              (datos?.aging ?? []).every((porcion) => porcion.saldoCentavos === 0),
            )}
            onReintentar={reintentar}
          />

          <GraficoSectores
            porciones={datos?.sectores ?? []}
            hhi={datos?.kpis.hhi ?? null}
            lecturaHhi={datos?.kpis.lecturaHhi ?? null}
            estado={estado((datos?.sectores.length ?? 0) === 0)}
            onReintentar={reintentar}
          />

          <GraficoCacLtv
            filas={datos?.canales ?? []}
            accionesSinAtribuir={datos?.accionesSinAtribuir ?? 0}
            estado={estado(
              (datos?.canales ?? []).every((fila) => fila.cacCentavos === null),
            )}
            onReintentar={reintentar}
          />
        </div>

        <GraficoTopClientes
          clientes={datos?.topClientes ?? []}
          estado={estado((datos?.topClientes.length ?? 0) === 0)}
          onReintentar={reintentar}
        />

        {contexto ? (
          <p className="text-xs text-muted-foreground">
            Serie de IPC hasta {formatearMesAnioGuion(contexto.mesBase)} · último MEP venta del{' '}
            {formatearFecha(contexto.fechaMepUltimo)}.
          </p>
        ) : null}
      </div>
    </>
  )
}
