/**
 * `/cuentas/:id`: la ficha individual de una cuenta.
 *
 * El contenedor trae los datos y arma props; los hijos son presentacionales. Las dos
 * escrituras que RLS permite desde el navegador viven aca: alta de accion comercial y
 * cambio de estado comercial (rule `supabase.md` §1).
 */

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'

import { FormularioAccion } from '@/components/acciones/FormularioAccion'
import { PanelLateral } from '@/components/comun/PanelLateral'
import { DatosCuenta } from '@/components/cuentas/DatosCuenta'
import { FacturasCuenta } from '@/components/cuentas/FacturasCuenta'
import { MetricasCuenta } from '@/components/cuentas/MetricasCuenta'
import { TimelineAcciones } from '@/components/cuentas/TimelineAcciones'
import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFichaCuenta } from '@/hooks/use-datos-crm'
import { useDatosDashboard } from '@/hooks/use-datos-dashboard'
import { useCrearAccion, useEditarEstadoComercial } from '@/hooks/use-mutaciones-crm'
import { useFilasCrm } from '@/hooks/use-datos-dashboard'
import { ETIQUETA_ESTADO_COMERCIAL } from '@/lib/etiquetas'
import { formatearMesAnioGuion } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'

export default function CuentaDetalle() {
  const hoy = useMemo(() => new Date(), [])
  const { id } = useParams<{ id: string }>()
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [verTodo, setVerTodo] = useState(false)

  const { datos: dashboard } = useDatosDashboard(hoy)
  const filas = useFilasCrm()
  const { ficha: fichaONula, contexto, estado } = useFichaCuenta(
    id,
    hoy,
    dashboard?.churnMensual ?? null,
  )

  const crearAccion = useCrearAccion()
  const editarEstado = useEditarEstadoComercial()

  // `null` es "no existe esa cuenta"; `undefined` es "todavia no llegaron los datos".
  const ficha = fichaONula ?? undefined
  const mesBase = contexto ? formatearMesAnioGuion(contexto.mesBase) : ''
  const campanias = filas.data?.campanias ?? []

  if (!estado.cargando && !estado.error && fichaONula === null) {
    return (
      <>
        <EncabezadoPagina titulo="Cuenta no encontrada" />
        <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <TriangleAlert className="size-6 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            No hay ninguna cuenta con ese identificador. Puede que el link esté viejo o que la
            cuenta se haya dado de baja.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/cuentas">
              <ArrowLeft className="size-4" aria-hidden />
              Volver a las cuentas
            </Link>
          </Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <EncabezadoPagina
        titulo={ficha?.empresa.razon_social ?? 'Cuenta'}
        descripcion={
          ficha
            ? `${ETIQUETA_ESTADO_COMERCIAL[ficha.empresa.estado_comercial]} · ${ficha.empresa.ciudad}, ${ficha.empresa.provincia}. El valor real está expresado en pesos de ${mesBase}.`
            : 'Cargando la ficha de la cuenta.'
        }
        acciones={
          <Button asChild variant="outline" size="sm">
            <Link to="/cuentas">
              <ArrowLeft className="size-4" aria-hidden />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <MetricasCuenta
          ficha={ficha}
          mesBase={mesBase}
          cargando={estado.cargando || estado.error}
        />

        {estado.error ? (
          <p className="flex items-center gap-2 rounded-md border border-negativo/40 bg-negativo/5 px-3 py-2 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-negativo" aria-hidden />
            No pudimos traer los datos de esta cuenta.
            <Button variant="outline" size="xs" onClick={estado.reintentar}>
              Reintentar
            </Button>
          </p>
        ) : null}

        {ficha ? (
          <DatosCuenta
            ficha={ficha}
            guardando={editarEstado.isPending}
            errorGuardado={mensajeDeError(editarEstado.error)}
            onCambiarEstado={(siguiente) =>
              editarEstado.mutate({ empresaId: ficha.empresa.id, estado: siguiente })
            }
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((indice) => (
              <Skeleton key={indice} className="h-64 w-full" />
            ))}
          </div>
        )}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <FacturasCuenta
            facturas={ficha?.facturas ?? []}
            cargando={estado.cargando}
            error={estado.error}
            onReintentar={estado.reintentar}
          />

          <TimelineAcciones
            eventos={ficha?.timeline ?? []}
            cargando={estado.cargando || estado.error}
            mostrarTodo={verTodo}
            onMostrarTodo={() => setVerTodo(true)}
            onNuevaAccion={() => setPanelAbierto(true)}
          />
        </div>
      </div>

      <PanelLateral
        abierto={panelAbierto && ficha !== undefined}
        onCerrar={() => setPanelAbierto(false)}
        titulo="Nueva acción comercial"
        descripcion={ficha?.empresa.razon_social}
        ancho="lg"
      >
        {ficha ? (
          <FormularioAccion
            empresaId={ficha.empresa.id}
            hoy={hoy}
            contactos={ficha.contactos.map((contacto) => ({
              id: contacto.id,
              nombre: `${contacto.nombre} ${contacto.apellido} — ${contacto.cargo}`,
            }))}
            oportunidades={ficha.oportunidades.map((oportunidad) => ({
              id: oportunidad.id,
              nombre: oportunidad.titulo,
            }))}
            campanias={campanias.map((campania) => ({
              id: campania.id,
              nombre: campania.nombre,
            }))}
            guardando={crearAccion.isPending}
            errorGuardado={mensajeDeError(crearAccion.error)}
            onGuardar={(datos) =>
              crearAccion.mutate(datos, { onSuccess: () => setPanelAbierto(false) })
            }
            onCancelar={() => setPanelAbierto(false)}
          />
        ) : null}
      </PanelLateral>
    </>
  )
}
