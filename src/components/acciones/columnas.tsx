/**
 * Columnas de las dos tablas de `/acciones`: el detalle de toques comerciales y el
 * resumen por campania con su ROI.
 *
 * Las celdas solo formatean lo que `armarAcciones` y `armarCampanias` ya calcularon.
 */

import { TextoRoi } from '@/components/acciones/TextoRoi'
import { CabeceraOrdenable } from '@/components/tabla/CabeceraOrdenable'
import { PuntoEtiqueta } from '@/components/tabla/PuntoEtiqueta'
import type { ColumnaKaudal } from '@/components/tabla/nucleo'
import type { FilaAccionVista, FilaCampaniaVista } from '@/lib/agregados/acciones'
import {
  COLOR_RESULTADO_ACCION,
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
} from '@/lib/etiquetas'
import { formatearCantidad, formatearFecha, formatearImporte } from '@/lib/formato'

export const COLUMNAS_ACCIONES: ColumnaKaudal<FilaAccionVista>[] = [
  {
    id: 'fecha',
    accessorFn: (fila) => fila.fecha,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Fecha" />,
    cell: ({ row }) => <span className="tabular">{formatearFecha(row.original.fecha)}</span>,
    meta: { etiqueta: 'Fecha', fija: true },
  },
  {
    id: 'tipo',
    accessorFn: (fila) => ETIQUETA_TIPO_ACCION[fila.tipo],
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Tipo" />,
    meta: { etiqueta: 'Tipo de acción' },
  },
  {
    id: 'resultado',
    accessorFn: (fila) => ETIQUETA_RESULTADO_ACCION[fila.resultado],
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Resultado" />,
    cell: ({ row }) => (
      <PuntoEtiqueta
        color={COLOR_RESULTADO_ACCION[row.original.resultado]}
        texto={ETIQUETA_RESULTADO_ACCION[row.original.resultado]}
      />
    ),
    meta: { etiqueta: 'Resultado' },
  },
  {
    id: 'razonSocial',
    accessorFn: (fila) => fila.razonSocial,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Cuenta" />,
    meta: { etiqueta: 'Cuenta' },
  },
  {
    id: 'owner',
    accessorFn: (fila) => fila.owner,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Owner" />,
    meta: { etiqueta: 'Owner comercial' },
  },
  {
    id: 'campania',
    accessorFn: (fila) => fila.campania,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Campaña" />,
    meta: { etiqueta: 'Campaña' },
  },
  {
    id: 'oportunidad',
    accessorFn: (fila) => fila.oportunidad,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Oportunidad" />,
    meta: { etiqueta: 'Oportunidad atribuida' },
  },
  {
    id: 'costo',
    accessorFn: (fila) => fila.costoArsCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Costo" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.costoArsCentavos),
    meta: { etiqueta: 'Costo ARS (nominal)', alineacion: 'derecha' },
  },
]

export const COLUMNAS_ACCIONES_OCULTAS = ['owner', 'oportunidad']

// ---------------------------------------------------------------------------
// Campanias
// ---------------------------------------------------------------------------

export const COLUMNAS_CAMPANIAS: ColumnaKaudal<FilaCampaniaVista>[] = [
  {
    id: 'nombre',
    accessorFn: (fila) => fila.nombre,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Campaña" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.nombre}</p>
        <p className="tabular truncate text-xs text-muted-foreground">
          {formatearFecha(row.original.fechaInicio)} al {formatearFecha(row.original.fechaFin)}
        </p>
      </div>
    ),
    meta: { etiqueta: 'Campaña', fija: true },
  },
  {
    id: 'canal',
    accessorFn: (fila) => fila.etiquetaCanal,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Canal" />,
    meta: { etiqueta: 'Canal' },
  },
  {
    id: 'presupuesto',
    accessorFn: (fila) => fila.presupuestoArsCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Presupuesto" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.presupuestoArsCentavos),
    meta: { etiqueta: 'Presupuesto ARS (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'costoAcciones',
    accessorFn: (fila) => fila.costoAccionesArsCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Costo ejecutado" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.costoAccionesArsCentavos),
    meta: { etiqueta: 'Costo de las acciones ARS (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'acciones',
    accessorFn: (fila) => fila.acciones,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Acciones" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearCantidad(row.original.acciones),
    meta: { etiqueta: 'Acciones generadas', alineacion: 'derecha' },
  },
  {
    id: 'atribuidas',
    accessorFn: (fila) => fila.oportunidadesAtribuidas,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Oportunidades" alineacion="derecha" />
    ),
    cell: ({ row }) => (
      <span
        title={`${formatearCantidad(row.original.oportunidadesGanadas)} ganadas de ${formatearCantidad(row.original.oportunidadesAtribuidas)} atribuidas`}
      >
        {formatearCantidad(row.original.oportunidadesGanadas)} /{' '}
        {formatearCantidad(row.original.oportunidadesAtribuidas)}
      </span>
    ),
    meta: { etiqueta: 'Oportunidades ganadas / atribuidas', alineacion: 'derecha' },
  },
  {
    id: 'retorno',
    accessorFn: (fila) => fila.retornoArsCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Retorno" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.retornoArsCentavos),
    meta: { etiqueta: 'Retorno ARS (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'roi',
    accessorFn: (fila) => fila.roi ?? Number.NEGATIVE_INFINITY,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="ROI" alineacion="derecha" />
    ),
    cell: ({ row }) => <TextoRoi roi={row.original.roi} />,
    meta: { etiqueta: 'ROI', alineacion: 'derecha' },
  },
]
