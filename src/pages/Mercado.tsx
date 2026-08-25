import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/mercado')

export default function Mercado() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'Cotizaciones del día: MEP, CCL, oficial, blue y tarjeta.',
          'Serie de inflación mensual, riesgo país y tasas de plazo fijo.',
          'Simulador con dos sliders: salto del MEP e inflación mensual esperada.',
          'Recálculo en vivo del valor real de la cartera, el forecast y la exposición cambiaria.',
          'Gráfico comparativo entre el escenario base y el simulado.',
        ]}
      />
    </>
  )
}
