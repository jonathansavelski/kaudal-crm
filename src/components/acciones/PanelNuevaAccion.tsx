/**
 * Alta de accion comercial desde `/acciones`, donde todavia no hay una cuenta elegida.
 *
 * Primero se elige la cuenta y recien despues aparece el formulario: contactos y
 * oportunidades dependen de ella, y ofrecer los de todas las cuentas seria ofrecer
 * combinaciones invalidas.
 */

import { useState } from 'react'

import { FormularioAccion } from '@/components/acciones/FormularioAccion'
import { PanelLateral } from '@/components/comun/PanelLateral'
import { SelectFormulario } from '@/components/comun/CamposFormulario'
import type {
  FilaCampania,
  FilaContacto,
  FilaEmpresa,
  FilaOportunidad,
} from '@/lib/api/consultas'
import type { NuevaAccion } from '@/lib/api/mutaciones'

export function PanelNuevaAccion({
  abierto,
  hoy,
  empresas,
  contactos,
  oportunidades,
  campanias,
  guardando,
  errorGuardado,
  onGuardar,
  onCerrar,
}: {
  abierto: boolean
  hoy: Date
  empresas: readonly FilaEmpresa[]
  contactos: readonly FilaContacto[]
  oportunidades: readonly FilaOportunidad[]
  campanias: readonly FilaCampania[]
  guardando: boolean
  errorGuardado: string | null
  onGuardar: (datos: NuevaAccion) => void
  onCerrar: () => void
}) {
  const [empresaId, setEmpresaId] = useState('')

  const cerrar = () => {
    setEmpresaId('')
    onCerrar()
  }

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Nueva acción comercial"
      descripcion="Se guarda en Supabase y recalcula el CAC del canal y el ROI de su campaña."
      ancho="lg"
    >
      <div className="space-y-4">
        <SelectFormulario
          id="accion-empresa"
          etiqueta="Cuenta"
          valor={empresaId}
          opciones={empresas.map((empresa) => ({
            valor: empresa.id,
            etiqueta: empresa.razon_social,
          }))}
          vacio="Elegí una cuenta"
          onCambio={setEmpresaId}
        />

        {empresaId === '' ? (
          <p className="text-sm text-muted-foreground">
            Elegí la cuenta para cargar la acción. Sus contactos y oportunidades se ofrecen recién
            después, para que no se pueda atribuir una acción a una oportunidad de otra empresa.
          </p>
        ) : (
          <FormularioAccion
            key={empresaId}
            empresaId={empresaId}
            hoy={hoy}
            contactos={contactos
              .filter((contacto) => contacto.empresa_id === empresaId)
              .map((contacto) => ({
                id: contacto.id,
                nombre: `${contacto.nombre} ${contacto.apellido} — ${contacto.cargo}`,
              }))}
            oportunidades={oportunidades
              .filter((oportunidad) => oportunidad.empresa_id === empresaId)
              .map((oportunidad) => ({ id: oportunidad.id, nombre: oportunidad.titulo }))}
            campanias={campanias.map((campania) => ({
              id: campania.id,
              nombre: campania.nombre,
            }))}
            guardando={guardando}
            errorGuardado={errorGuardado}
            onGuardar={onGuardar}
            onCancelar={cerrar}
          />
        )}
      </div>
    </PanelLateral>
  )
}
