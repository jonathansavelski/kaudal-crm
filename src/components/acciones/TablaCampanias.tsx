/**
 * Vista de campanias: presupuesto, acciones generadas, oportunidades atribuidas y ROI.
 *
 * El ROI se define en `src/lib/agregados/acciones.ts`, no aca: este componente formatea.
 */

import { estadoDePanel } from '@/components/charts/utilidades'
import { COLUMNAS_CAMPANIAS } from '@/components/acciones/columnas'
import { BotonExportar } from '@/components/tabla/BotonExportar'
import { SelectorColumnas } from '@/components/tabla/SelectorColumnas'
import { TablaDatos } from '@/components/tabla/TablaDatos'
import { useTablaKaudal } from '@/components/tabla/nucleo'
import type { FilaCampaniaVista } from '@/lib/agregados/acciones'
import { hojaDeCampanias } from '@/lib/agregados/exportables'

export function TablaCampanias({
  campanias,
  cargando,
  error,
  onReintentar,
}: {
  campanias: readonly FilaCampaniaVista[]
  cargando: boolean
  error: boolean
  onReintentar: () => void
}) {
  const tabla = useTablaKaudal({
    columnas: COLUMNAS_CAMPANIAS,
    datos: campanias,
    ordenPorDefecto: [{ id: 'roi', desc: true }],
    // Prefijo propio: en esta pantalla conviven dos tablas y cada una pagina por su lado.
    prefijo: 'camp',
  })

  return (
    <section className="min-w-0 space-y-2">
      <h2 className="text-base font-semibold">Campañas</h2>
      <p className="text-sm text-muted-foreground">
        El ROI compara el monto de las oportunidades ganadas atribuidas contra el presupuesto de la
        campaña, los dos en pesos nominales. Una oportunidad se atribuye cuando existe una acción
        que apunta a la campaña y a la oportunidad.
      </p>

      <TablaDatos
        tabla={tabla}
        estado={estadoDePanel({ cargando, error, vacio: campanias.length === 0 })}
        sustantivoPlural="campañas"
        mensajeVacio="No hay campañas cargadas. Sin campañas no hay CAC por canal ni ROI que medir."
        onReintentar={onReintentar}
        barra={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SelectorColumnas tabla={tabla} />
            <BotonExportar
              nombreArchivo="kaudal-campanias.xlsx"
              cantidad={campanias.length}
              deshabilitado={cargando || error}
              hojas={() => [hojaDeCampanias(campanias)]}
            />
          </div>
        }
      />
    </section>
  )
}
