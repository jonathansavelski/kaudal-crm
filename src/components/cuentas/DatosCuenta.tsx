/**
 * Datos de la empresa, sus contactos y su contrato vigente.
 *
 * El estado comercial se puede editar acá: es uno de los dos campos que RLS deja
 * escribir desde el navegador (rule `supabase.md` §1).
 */

import { useState } from 'react'
import { Check, Loader2, Mail, Phone, Star, TriangleAlert } from 'lucide-react'

import { SelectFormulario } from '@/components/comun/CamposFormulario'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { FichaCuenta } from '@/lib/agregados/ficha'
import {
  ESTADOS_COMERCIALES,
  ETIQUETA_ESTADO_COMERCIAL,
  ETIQUETA_ESTADO_CONTRATO,
  ETIQUETA_MOTIVO_BAJA,
  ETIQUETA_SECTOR,
  ETIQUETA_TAMANIO,
} from '@/lib/etiquetas'
import { formatearFecha, formatearImporte } from '@/lib/formato'
import type { Enums } from '@/types/supabase'

const OPCIONES_ESTADO = ESTADOS_COMERCIALES.map((estado) => ({
  valor: estado,
  etiqueta: ETIQUETA_ESTADO_COMERCIAL[estado],
}))

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="truncate text-sm font-medium">{valor}</dd>
    </div>
  )
}

export function DatosCuenta({
  ficha,
  guardando,
  errorGuardado,
  onCambiarEstado,
}: {
  ficha: FichaCuenta
  guardando: boolean
  errorGuardado: string | null
  onCambiarEstado: (estado: Enums<'estado_comercial'>) => void
}) {
  const [estado, setEstado] = useState<string>(ficha.empresa.estado_comercial)
  const sinCambios = estado === ficha.empresa.estado_comercial

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-3">
      <Card className="min-w-0 gap-4 py-5">
        <CardHeader className="px-5">
          <h2 className="text-base font-semibold">Datos de la cuenta</h2>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <dl className="grid grid-cols-2 gap-3">
            <Dato etiqueta="CUIT" valor={ficha.empresa.cuit} />
            <Dato etiqueta="Sector" valor={ETIQUETA_SECTOR[ficha.empresa.sector]} />
            <Dato etiqueta="Tamaño" valor={ETIQUETA_TAMANIO[ficha.empresa.tamanio]} />
            <Dato etiqueta="Owner comercial" valor={ficha.empresa.owner_comercial} />
            <Dato
              etiqueta="Ubicación"
              valor={`${ficha.empresa.ciudad}, ${ficha.empresa.provincia}`}
            />
            <Dato etiqueta="Alta" valor={formatearFecha(ficha.empresa.fecha_alta)} />
          </dl>

          <div className="space-y-2 border-t pt-4">
            <SelectFormulario
              id="estado-comercial"
              etiqueta="Estado comercial"
              valor={estado}
              opciones={OPCIONES_ESTADO}
              onCambio={setEstado}
            />

            <Button
              size="sm"
              disabled={sinCambios || guardando}
              onClick={() => onCambiarEstado(estado as Enums<'estado_comercial'>)}
            >
              {guardando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Guardar estado
            </Button>

            {errorGuardado ? (
              <p role="alert" className="flex items-start gap-2 text-sm text-negativo">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {errorGuardado}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 gap-4 py-5">
        <CardHeader className="px-5">
          <h2 className="text-base font-semibold">Contactos ({ficha.contactos.length})</h2>
        </CardHeader>
        <CardContent className="px-5">
          {ficha.contactos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta cuenta todavía no tiene contactos cargados. Sin un decisor identificado, la
              oportunidad avanza a ciegas.
            </p>
          ) : (
            <ul className="divide-y">
              {ficha.contactos.map((contacto) => (
                <li key={contacto.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {contacto.nombre} {contacto.apellido}
                    {contacto.es_decisor ? (
                      <Star className="size-3.5 text-primary" aria-label="Decisor de compra" />
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{contacto.cargo}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden />
                      {contacto.email}
                    </span>
                    <span className="tabular flex items-center gap-1">
                      <Phone className="size-3.5" aria-hidden />
                      {contacto.telefono}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 gap-4 py-5">
        <CardHeader className="px-5">
          <h2 className="text-base font-semibold">Contrato</h2>
        </CardHeader>
        <CardContent className="px-5">
          {ficha.contratoVigente ? (
            <>
              <p className="tabular text-2xl font-semibold">
                {formatearImporte(ficha.abonoVigenteArsCentavos)}
              </p>
              <p className="text-sm text-muted-foreground">abono mensual nominal · ARS</p>
              {ficha.contratoVigente.moneda === 'USD' ? (
                <p className="tabular text-sm text-muted-foreground">
                  Pactado en{' '}
                  {formatearImporte(ficha.contratoVigente.abono_mensual_centavos, 'USD')} por mes
                </p>
              ) : null}

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                <Dato
                  etiqueta="Estado"
                  valor={ETIQUETA_ESTADO_CONTRATO[ficha.contratoVigente.estado]}
                />
                <Dato etiqueta="Inicio" valor={formatearFecha(ficha.contratoVigente.fecha_inicio)} />
              </dl>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              La cuenta no tiene contrato activo, así que no aporta MRR.
              {ficha.contratos.length > 0
                ? ` Tuvo ${ficha.contratos.length} contrato(s): el último se dio de baja por ${
                    ficha.contratos[0]?.motivo_baja
                      ? ETIQUETA_MOTIVO_BAJA[ficha.contratos[0].motivo_baja].toLowerCase()
                      : 'un motivo no cargado'
                  }.`
                : ' Nunca tuvo uno: sigue siendo un prospecto.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
