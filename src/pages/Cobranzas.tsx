import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/cobranzas')

export default function Cobranzas() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'Aging con drill-down: al hacer clic en un bucket se filtra la tabla de facturas.',
          'DSO del período y saldo de cartera nominal, real y en USD MEP.',
          'VAN de la cartera a la tasa del mercado, con input para cambiarla a mano.',
          'Provisión por incobrabilidad calculada con las PD por bucket.',
          'Exportación a Excel del detalle de facturas.',
        ]}
      />
    </>
  )
}
