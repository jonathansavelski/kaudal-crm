/**
 * Detalle de una oportunidad y sus acciones comerciales asociadas, en el panel lateral.
 *
 * Cierra con Escape y con click afuera: lo resuelve `PanelLateral`.
 */

import { ArrowUpRight, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PanelLateral } from '@/components/comun/PanelLateral'
import { Button } from '@/components/ui/button'
import type { FilaAccion } from '@/lib/api/consultas'
import type { OportunidadVista } from '@/lib/agregados/pipeline'
import {
  ETIQUETA_CANAL,
  ETIQUETA_ETAPA,
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
  ETIQUETA_TIPO_OPORTUNIDAD,
  COLOR_RESULTADO_ACCION,
} from '@/lib/etiquetas'
import { formatearFecha, formatearImporte, formatearPorcentaje } from '@/lib/formato'

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="tabular truncate text-sm font-medium">{valor}</dd>
      {nota ? <p className="text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  )
}

export function PanelOportunidad({
  oportunidad,
  acciones,
  onCerrar,
}: {
  oportunidad: OportunidadVista | null
  acciones: readonly FilaAccion[]
  onCerrar: () => void
}) {
  return (
    <PanelLateral
      abierto={oportunidad !== null}
      onCerrar={onCerrar}
      titulo={oportunidad?.titulo ?? 'Oportunidad'}
      descripcion={oportunidad?.razonSocial}
      pie={
        oportunidad ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/cuentas/${oportunidad.empresaId}`}>
              Ver la ficha de la cuenta
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null
      }
    >
      {oportunidad ? (
        <div className="space-y-5">
          <div>
            <p className="tabular text-2xl font-semibold">
              {formatearImporte(oportunidad.montoArsCentavos)}
            </p>
            <p className="text-sm text-muted-foreground">nominal · ARS</p>
            {oportunidad.moneda === 'USD' ? (
              <p className="tabular text-sm text-muted-foreground">
                Facturada en {formatearImporte(oportunidad.montoOriginalCentavos, 'USD')} · valuada
                al último MEP venta conocido
              </p>
            ) : null}
            <p className="tabular mt-1 text-sm">
              {formatearImporte(oportunidad.montoPonderadoCentavos)}{' '}
              <span className="text-muted-foreground">ponderado por etapa</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t pt-4">
            <Dato
              etiqueta="Etapa"
              valor={ETIQUETA_ETAPA[oportunidad.etapa]}
              nota={`${formatearPorcentaje(oportunidad.probabilidad, 0)} de probabilidad`}
            />
            <Dato etiqueta="Owner comercial" valor={oportunidad.owner} />
            <Dato etiqueta="Tipo" valor={ETIQUETA_TIPO_OPORTUNIDAD[oportunidad.tipo]} />
            <Dato etiqueta="Origen" valor={ETIQUETA_CANAL[oportunidad.origen]} />
            <Dato etiqueta="Creada" valor={formatearFecha(oportunidad.fechaCreacion)} />
            <Dato
              etiqueta="Cierre estimado"
              valor={formatearFecha(oportunidad.fechaCierreEstimada)}
            />
          </dl>

          <div className="border-t pt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
              Acciones asociadas ({acciones.length})
            </h3>

            {acciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no se cargó ninguna acción comercial contra esta oportunidad. Las acciones
                se dan de alta desde la ficha de la cuenta.
              </p>
            ) : (
              <ul className="space-y-2">
                {acciones.map((accion) => (
                  <li key={accion.id} className="rounded-md border p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {ETIQUETA_TIPO_ACCION[accion.tipo]}
                      </span>
                      <span className="tabular text-xs text-muted-foreground">
                        {formatearFecha(accion.fecha)}
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ backgroundColor: COLOR_RESULTADO_ACCION[accion.resultado] }}
                      />
                      {ETIQUETA_RESULTADO_ACCION[accion.resultado]}
                      <span className="tabular ml-auto text-muted-foreground">
                        {formatearImporte(accion.costo_centavos, accion.moneda)} de costo
                      </span>
                    </p>

                    {accion.notas ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">{accion.notas}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </PanelLateral>
  )
}
