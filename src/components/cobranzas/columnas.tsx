/**
 * Columnas de la tabla de facturas. Las usan `/cobranzas` y la ficha de cuenta: la misma
 * factura se lee igual en las dos pantallas.
 *
 * El estado se distingue por **texto** ademas de por color (rule `ui.md` §5).
 */

import { CabeceraOrdenable } from '@/components/tabla/CabeceraOrdenable'
import { PuntoEtiqueta } from '@/components/tabla/PuntoEtiqueta'
import type { ColumnaKaudal } from '@/components/tabla/nucleo'
import type { FilaCobranza } from '@/lib/agregados/cobranzas'
import {
  COLOR_BUCKET,
  COLOR_ESTADO_FACTURA,
  ETIQUETA_BUCKET,
  ETIQUETA_ESTADO_FACTURA,
} from '@/lib/etiquetas'
import { formatearDias, formatearFecha, formatearImporte } from '@/lib/formato'

type Columna = ColumnaKaudal<FilaCobranza>

const NUMERO: Columna = {
  id: 'numero',
  accessorFn: (fila) => fila.numero,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Factura" />,
  cell: ({ row }) => <span className="tabular">{row.original.numero}</span>,
  meta: { etiqueta: 'Número de factura', fija: true },
}

const CUENTA: Columna = {
  id: 'razonSocial',
  accessorFn: (fila) => fila.razonSocial,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Cuenta" />,
  cell: ({ row }) => <span className="truncate">{row.original.razonSocial}</span>,
  meta: { etiqueta: 'Cuenta' },
}

const EMISION: Columna = {
  id: 'fechaEmision',
  accessorFn: (fila) => fila.fechaEmision,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Emisión" />,
  cell: ({ row }) => <span className="tabular">{formatearFecha(row.original.fechaEmision)}</span>,
  meta: { etiqueta: 'Fecha de emisión' },
}

const VENCIMIENTO: Columna = {
  id: 'fechaVencimiento',
  accessorFn: (fila) => fila.fechaVencimiento,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Vencimiento" />,
  cell: ({ row }) => (
    <span className="tabular">{formatearFecha(row.original.fechaVencimiento)}</span>
  ),
  meta: { etiqueta: 'Fecha de vencimiento' },
}

const ESTADO: Columna = {
  id: 'estadoVigente',
  accessorFn: (fila) => ETIQUETA_ESTADO_FACTURA[fila.estadoVigente],
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Estado" />,
  cell: ({ row }) => (
    <PuntoEtiqueta
      color={COLOR_ESTADO_FACTURA[row.original.estadoVigente]}
      texto={ETIQUETA_ESTADO_FACTURA[row.original.estadoVigente]}
    />
  ),
  meta: { etiqueta: 'Estado vigente' },
}

const BUCKET: Columna = {
  id: 'bucket',
  accessorFn: (fila) => fila.diasMora,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Antigüedad" />,
  cell: ({ row }) => (
    <PuntoEtiqueta
      color={COLOR_BUCKET[row.original.bucket]}
      texto={ETIQUETA_BUCKET[row.original.bucket]}
    />
  ),
  meta: { etiqueta: 'Bucket de aging' },
}

const MORA: Columna = {
  id: 'diasMora',
  accessorFn: (fila) => fila.diasMora,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Mora" alineacion="derecha" />,
  cell: ({ row }) => formatearDias(row.original.diasMora),
  meta: { etiqueta: 'Días de mora', alineacion: 'derecha' },
}

const MONEDA: Columna = {
  id: 'moneda',
  accessorFn: (fila) => fila.moneda,
  header: ({ column }) => <CabeceraOrdenable columna={column} titulo="Moneda" />,
  meta: { etiqueta: 'Moneda de emisión' },
}

const MONTO: Columna = {
  id: 'montoArs',
  accessorFn: (fila) => fila.montoArsCentavos,
  header: ({ column }) => (
    <CabeceraOrdenable columna={column} titulo="Monto" alineacion="derecha" />
  ),
  cell: ({ row }) => (
    <span
      title={
        row.original.moneda === 'USD'
          ? `Facturada en ${formatearImporte(row.original.montoOriginalCentavos, 'USD')}, llevada a pesos al MEP venta de su emisión`
          : undefined
      }
    >
      {formatearImporte(row.original.montoArsCentavos)}
    </span>
  ),
  meta: { etiqueta: 'Monto ARS (nominal)', alineacion: 'derecha' },
}

const SALDO: Columna = {
  id: 'saldoArs',
  accessorFn: (fila) => fila.saldoArsCentavos,
  header: ({ column }) => (
    <CabeceraOrdenable columna={column} titulo="Saldo" alineacion="derecha" />
  ),
  cell: ({ row }) => formatearImporte(row.original.saldoArsCentavos),
  meta: { etiqueta: 'Saldo ARS (nominal)', alineacion: 'derecha' },
}

const SALDO_REAL: Columna = {
  id: 'saldoReal',
  accessorFn: (fila) => fila.saldoRealCentavos,
  header: ({ column }) => (
    <CabeceraOrdenable columna={column} titulo="Saldo real" alineacion="derecha" />
  ),
  cell: ({ row }) => formatearImporte(row.original.saldoRealCentavos),
  meta: { etiqueta: 'Saldo ARS (real)', alineacion: 'derecha' },
}

/** Con la cuenta: es la tabla de `/cobranzas`, que cruza todas las empresas. */
export const COLUMNAS_COBRANZAS: Columna[] = [
  NUMERO,
  CUENTA,
  EMISION,
  VENCIMIENTO,
  ESTADO,
  BUCKET,
  MORA,
  MONEDA,
  MONTO,
  SALDO,
  SALDO_REAL,
]

/** Sin la cuenta: en la ficha ya sabemos de quién es cada factura. */
export const COLUMNAS_FACTURAS_CUENTA: Columna[] = [
  NUMERO,
  EMISION,
  VENCIMIENTO,
  ESTADO,
  BUCKET,
  MORA,
  MONEDA,
  MONTO,
  SALDO,
  SALDO_REAL,
]

export const COLUMNAS_COBRANZAS_OCULTAS = ['moneda', 'saldoReal']
