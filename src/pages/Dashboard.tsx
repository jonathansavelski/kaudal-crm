import { EncabezadoPagina } from '@/components/layout/EncabezadoPagina'
import { EnConstruccion } from '@/components/layout/EnConstruccion'
import { itemDeRuta } from '@/lib/navegacion'

const ITEM = itemDeRuta('/')

export default function Dashboard() {
  return (
    <>
      <EncabezadoPagina titulo={ITEM.titulo} descripcion={ITEM.descripcion} />
      <EnConstruccion
        items={[
          'KPIs: MRR, pipeline ponderado, DSO, saldo de cartera nominal y real, ECL y HHI.',
          'Evolución de MRR y facturación a 24 meses, nominal en línea sólida y real punteada.',
          'Embudo de pipeline por etapa, con monto y cantidad de oportunidades.',
          'Aging de cuentas por cobrar en barras apiladas por bucket.',
          'Facturación por sector con el HHI de concentración al lado.',
          'CAC contra LTV por canal de adquisición.',
          'Top 10 clientes por facturación, coloreados por score de riesgo.',
          'Cada KPI con su popover explicando la fórmula en una línea.',
        ]}
      />
    </>
  )
}
