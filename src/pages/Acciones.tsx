import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/acciones')

export default function Acciones() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'Tabla de acciones comerciales con filtros por tipo, campaña, fecha y resultado.',
          'Alta de una acción nueva, con validación del formulario.',
          'Campañas con presupuesto, acciones generadas y oportunidades atribuidas.',
          'ROI y CAC por canal, tomados de la capa de métricas.',
        ]}
      />
    </>
  )
}
