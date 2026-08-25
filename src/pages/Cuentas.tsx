import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/cuentas')

export default function Cuentas() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'Tabla maestra de las 120 empresas con paginado, orden y selector de columnas.',
          'Filtros por estado comercial, sector, tamaño, provincia, owner y facturación.',
          'Contador de cuántas cuentas cumplen los filtros sobre el total.',
          'Exportación a Excel del resultado filtrado.',
          'Ficha individual en /cuentas/:id con contactos, contrato, métricas y timeline.',
        ]}
      />
    </>
  )
}
