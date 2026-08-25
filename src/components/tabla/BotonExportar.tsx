/**
 * Boton de exportacion a Excel. Exporta **el resultado filtrado**, que es lo que el
 * usuario esta mirando; el texto del boton lo dice para que no haya sorpresa.
 */

import { useState } from 'react'
import { Download, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { HojaExcel } from '@/lib/exportar-excel'
import { descargarExcel } from '@/lib/exportar-excel'
import { formatearCantidad } from '@/lib/formato'

export function BotonExportar({
  nombreArchivo,
  hojas,
  cantidad,
  deshabilitado = false,
}: {
  nombreArchivo: string
  /** Se arma al hacer click, no en cada render: puede ser un mapeo caro. */
  hojas: () => readonly HojaExcel[]
  cantidad: number
  deshabilitado?: boolean
}) {
  const [fallo, setFallo] = useState(false)

  const exportar = () => {
    try {
      descargarExcel(nombreArchivo, hojas())
      setFallo(false)
    } catch {
      // El navegador puede bloquear la descarga; se avisa en vez de fallar en silencio.
      setFallo(true)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {fallo ? (
        <span className="flex items-center gap-1 text-xs text-negativo">
          <TriangleAlert className="size-3.5" aria-hidden />
          No se pudo generar el archivo
        </span>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        onClick={exportar}
        disabled={deshabilitado || cantidad === 0}
        title={`Exporta las ${formatearCantidad(cantidad)} filas que cumplen los filtros`}
      >
        <Download className="size-4" aria-hidden />
        Exportar a Excel
      </Button>
    </div>
  )
}
