/**
 * Punto de color + texto. Lo usan las columnas de estado, de bucket de aging y de
 * resultado: el color acompana a la palabra, nunca la reemplaza (rule `ui.md` §5).
 */

export function PuntoEtiqueta({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {texto}
    </span>
  )
}
