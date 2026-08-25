/**
 * Alta de una accion comercial, con validacion antes de tocar la base.
 *
 * Es una de las dos unicas escrituras del front: RLS abre `insert` sobre
 * `acciones_comerciales` a `authenticated` y nada mas (rule `supabase.md` §1).
 *
 * El borrador y su validacion viven en `borrador-accion.ts`; este componente solo pinta
 * y avisa.
 */

import type { FormEvent } from 'react'
import { useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'

import type { BorradorAccion } from '@/components/acciones/borrador-accion'
import {
  aNuevaAccion,
  borradorInicial,
  MAX_NOTAS,
  OPCIONES_MONEDA,
  OPCIONES_RESULTADO_ACCION,
  OPCIONES_TIPO_ACCION,
  validarBorrador,
} from '@/components/acciones/borrador-accion'
import { CampoFormulario, SelectFormulario } from '@/components/comun/CamposFormulario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NuevaAccion } from '@/lib/api/mutaciones'
import { aIso } from '@/lib/agregados/facturas'

export type OpcionRelacion = { id: string; nombre: string }

function aOpciones(relaciones: readonly OpcionRelacion[]) {
  return relaciones.map((relacion) => ({ valor: relacion.id, etiqueta: relacion.nombre }))
}

export function FormularioAccion({
  empresaId,
  hoy,
  contactos,
  oportunidades,
  campanias,
  guardando,
  errorGuardado,
  onGuardar,
  onCancelar,
}: {
  empresaId: string
  hoy: Date
  contactos: readonly OpcionRelacion[]
  oportunidades: readonly OpcionRelacion[]
  campanias: readonly OpcionRelacion[]
  guardando: boolean
  errorGuardado: string | null
  onGuardar: (datos: NuevaAccion) => void
  onCancelar: () => void
}) {
  const [borrador, setBorrador] = useState<BorradorAccion>(() => borradorInicial(hoy))
  const [error, setError] = useState<string | null>(null)

  const cambiar = (clave: keyof BorradorAccion, valor: string) => {
    setBorrador((previo) => ({ ...previo, [clave]: valor }))
    setError(null)
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()

    const problema = validarBorrador(borrador, hoy)
    if (problema) {
      setError(problema)
      return
    }

    onGuardar(aNuevaAccion(borrador, empresaId))
  }

  const aviso = error ?? errorGuardado

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectFormulario
          id="accion-tipo"
          etiqueta="Tipo de acción"
          valor={borrador.tipo}
          opciones={OPCIONES_TIPO_ACCION}
          onCambio={(valor) => cambiar('tipo', valor)}
        />

        <SelectFormulario
          id="accion-resultado"
          etiqueta="Resultado"
          valor={borrador.resultado}
          opciones={OPCIONES_RESULTADO_ACCION}
          onCambio={(valor) => cambiar('resultado', valor)}
        />

        <CampoFormulario id="accion-fecha" etiqueta="Fecha">
          <Input
            id="accion-fecha"
            type="date"
            max={aIso(hoy)}
            value={borrador.fecha}
            onChange={(evento) => cambiar('fecha', evento.target.value)}
            required
          />
        </CampoFormulario>

        <div className="grid grid-cols-2 gap-2">
          <CampoFormulario id="accion-costo" etiqueta="Costo">
            <Input
              id="accion-costo"
              type="number"
              min="0"
              step="0.01"
              value={borrador.costo}
              onChange={(evento) => cambiar('costo', evento.target.value)}
            />
          </CampoFormulario>

          <SelectFormulario
            id="accion-moneda"
            etiqueta="Moneda"
            valor={borrador.moneda}
            opciones={OPCIONES_MONEDA}
            onCambio={(valor) => cambiar('moneda', valor)}
          />
        </div>

        <SelectFormulario
          id="accion-contacto"
          etiqueta="Contacto"
          valor={borrador.contactoId}
          opciones={aOpciones(contactos)}
          vacio="Sin contacto"
          onCambio={(valor) => cambiar('contactoId', valor)}
        />

        <SelectFormulario
          id="accion-oportunidad"
          etiqueta="Oportunidad"
          valor={borrador.oportunidadId}
          opciones={aOpciones(oportunidades)}
          vacio="Sin oportunidad"
          onCambio={(valor) => cambiar('oportunidadId', valor)}
        />

        <div className="sm:col-span-2">
          <SelectFormulario
            id="accion-campania"
            etiqueta="Campaña"
            valor={borrador.campaniaId}
            opciones={aOpciones(campanias)}
            vacio="Sin campaña"
            ayuda="Atribuir la acción a una campaña es lo que alimenta su ROI y el CAC del canal."
            onCambio={(valor) => cambiar('campaniaId', valor)}
          />
        </div>

        <div className="sm:col-span-2">
          <CampoFormulario id="accion-notas" etiqueta="Notas">
            <textarea
              id="accion-notas"
              rows={3}
              maxLength={MAX_NOTAS}
              value={borrador.notas}
              onChange={(evento) => cambiar('notas', evento.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              placeholder="Qué se habló, qué quedó pendiente"
            />
          </CampoFormulario>
        </div>
      </div>

      {aviso ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-negativo/40 bg-negativo/5 px-3 py-2 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-negativo" aria-hidden />
          {aviso}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Guardar acción
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
