/**
 * Columnas de la tabla maestra de `/cuentas`.
 *
 * Cada celda solo formatea un numero que ya vino calculado por `armarCuentas`: ningun
 * `reduce` sobre centavos vive aca (rule `stack.md` §3). Los importes van a la derecha
 * con `.tabular` via el `meta.alineacion` que lee `TablaDatos`.
 */

import { CabeceraOrdenable } from '@/components/tabla/CabeceraOrdenable'
import { PuntoEtiqueta } from '@/components/tabla/PuntoEtiqueta'
import type { ColumnaKaudal } from '@/components/tabla/nucleo'
import { colorDeScore, etiquetaDeScore } from '@/lib/agregados/clientes'
import type { FilaCuenta } from '@/lib/agregados/cuentas'
import {
  COLOR_ESTADO_COMERCIAL,
  ETIQUETA_ESTADO_COMERCIAL,
  ETIQUETA_SECTOR,
  ETIQUETA_TAMANIO,
} from '@/lib/etiquetas'
import {
  formatearCantidad,
  formatearDias,
  formatearFecha,
  formatearImporte,
  formatearIndice,
} from '@/lib/formato'

export const COLUMNAS_CUENTAS: ColumnaKaudal<FilaCuenta>[] = [
  {
    id: 'razonSocial',
    accessorFn: (fila) => fila.razonSocial,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Razón social" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.razonSocial}</p>
        <p className="tabular truncate text-xs text-muted-foreground">
          CUIT {row.original.cuit} · {row.original.ciudad}
        </p>
      </div>
    ),
    meta: { etiqueta: 'Razón social', fija: true },
  },
  {
    id: 'estadoComercial',
    accessorFn: (fila) => ETIQUETA_ESTADO_COMERCIAL[fila.estadoComercial],
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Estado" />,
    cell: ({ row }) => (
      <PuntoEtiqueta
        color={COLOR_ESTADO_COMERCIAL[row.original.estadoComercial]}
        texto={ETIQUETA_ESTADO_COMERCIAL[row.original.estadoComercial]}
      />
    ),
    meta: { etiqueta: 'Estado comercial' },
  },
  {
    id: 'sector',
    accessorFn: (fila) => ETIQUETA_SECTOR[fila.sector],
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Sector" />,
    meta: { etiqueta: 'Sector' },
  },
  {
    id: 'tamanio',
    accessorFn: (fila) => ETIQUETA_TAMANIO[fila.tamanio],
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Tamaño" />,
    meta: { etiqueta: 'Tamaño' },
  },
  {
    id: 'provincia',
    accessorFn: (fila) => fila.provincia,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Provincia" />,
    meta: { etiqueta: 'Provincia' },
  },
  {
    id: 'owner',
    accessorFn: (fila) => fila.owner,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Owner" />,
    meta: { etiqueta: 'Owner comercial' },
  },
  {
    id: 'facturacion12m',
    accessorFn: (fila) => fila.facturacion12mCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Facturación 12m" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.facturacion12mCentavos),
    meta: { etiqueta: 'Facturación 12 meses (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'facturacion12mReal',
    accessorFn: (fila) => fila.facturacion12mRealCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Facturación 12m real" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.facturacion12mRealCentavos),
    meta: { etiqueta: 'Facturación 12 meses (real)', alineacion: 'derecha' },
  },
  {
    id: 'saldo',
    accessorFn: (fila) => fila.saldoCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Saldo pendiente" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearImporte(row.original.saldoCentavos),
    meta: { etiqueta: 'Saldo pendiente (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'abono',
    accessorFn: (fila) => fila.abonoMensualCentavos ?? -1,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Abono mensual" alineacion="derecha" />
    ),
    cell: ({ row }) =>
      row.original.abonoMensualCentavos === null
        ? <span className="text-muted-foreground">sin contrato</span>
        : formatearImporte(row.original.abonoMensualCentavos),
    meta: { etiqueta: 'Abono mensual (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'mora',
    accessorFn: (fila) => fila.moraPromedioDias,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Mora promedio" alineacion="derecha" />
    ),
    cell: ({ row }) => formatearDias(row.original.moraPromedioDias),
    meta: { etiqueta: 'Mora promedio', alineacion: 'derecha' },
  },
  {
    id: 'score',
    accessorFn: (fila) => fila.score,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Score de riesgo" alineacion="derecha" />
    ),
    cell: ({ row }) => (
      <span title={etiquetaDeScore(row.original.score)}>
        <PuntoEtiqueta
          color={colorDeScore(row.original.score)}
          texto={formatearIndice(row.original.score)}
        />
      </span>
    ),
    meta: { etiqueta: 'Score de riesgo', alineacion: 'derecha' },
  },
  {
    id: 'pipeline',
    accessorFn: (fila) => fila.pipelineCentavos,
    header: ({ column }) => (
      <CabeceraOrdenable columna={column} titulo="Pipeline abierto" alineacion="derecha" />
    ),
    cell: ({ row }) => (
      <span title={`${formatearCantidad(row.original.oportunidadesAbiertas)} oportunidades abiertas`}>
        {formatearImporte(row.original.pipelineCentavos)}
      </span>
    ),
    meta: { etiqueta: 'Pipeline abierto (nominal)', alineacion: 'derecha' },
  },
  {
    id: 'fechaAlta',
    accessorFn: (fila) => fila.fechaAlta,
    header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Alta" />,
    cell: ({ row }) => <span className="tabular">{formatearFecha(row.original.fechaAlta)}</span>,
    meta: { etiqueta: 'Fecha de alta' },
  },
]

/** Columnas que arrancan ocultas: la tabla entra en pantalla sin scroll horizontal. */
export const COLUMNAS_CUENTAS_OCULTAS = ['facturacion12mReal', 'abono', 'pipeline', 'fechaAlta']
