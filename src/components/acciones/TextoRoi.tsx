/**
 * ROI de una campania. Va con signo y con color, pero el signo alcanza solo: un `-40%`
 * se lee igual en blanco y negro.
 */

import { formatearPorcentaje } from '@/lib/formato'

export function TextoRoi({ roi }: { roi: number | null }) {
  if (roi === null) return <span className="text-muted-foreground">sin presupuesto cargado</span>

  const color = roi > 0 ? 'text-positivo' : roi < 0 ? 'text-negativo' : ''

  return (
    <span className={color}>
      {roi > 0 ? '+' : ''}
      {formatearPorcentaje(roi, 0)}
    </span>
  )
}
