import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/pipeline')

export default function Pipeline() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'Oportunidades por etapa, con total y total ponderado de cada una.',
          'Forecast a 3 y 6 meses sobre las fechas de cierre estimadas.',
          'Filtros por owner, origen, tipo y rango de monto, guardados en la URL.',
          'Panel lateral con el detalle de la oportunidad y sus acciones asociadas.',
        ]}
      />
    </>
  )
}
