import 'dotenv/config'
import { conectar } from './scripts/lib/db.ts'

const c = await conectar()
const q = async (sql: string) => (await c.query(sql)).rows

const linea = (t: string, v: unknown) => console.log(t.padEnd(58), JSON.stringify(v))

console.log('=== CONTEOS ===')
for (const t of ['empresas','contactos','campanias','oportunidades','contratos','facturas','cobros','acciones_comerciales','ipc_mensual','tipo_cambio','v_saldo_facturas']) {
  const r = await q(`select count(*)::int n from ${t}`)
  linea(t, r[0].n)
}

console.log('\n=== FK COLGADOS ===')
const fks: [string,string,string,string][] = [
  ['contactos','empresa_id','empresas','id'],
  ['oportunidades','empresa_id','empresas','id'],
  ['acciones_comerciales','empresa_id','empresas','id'],
  ['acciones_comerciales','contacto_id','contactos','id'],
  ['acciones_comerciales','oportunidad_id','oportunidades','id'],
  ['acciones_comerciales','campania_id','campanias','id'],
  ['contratos','empresa_id','empresas','id'],
  ['facturas','empresa_id','empresas','id'],
  ['facturas','contrato_id','contratos','id'],
  ['facturas','oportunidad_id','oportunidades','id'],
  ['cobros','factura_id','facturas','id'],
]
for (const [t,col,ref,rc] of fks) {
  const r = await q(`select count(*)::int n from ${t} x where x.${col} is not null and not exists (select 1 from ${ref} y where y.${rc}=x.${col})`)
  linea(`${t}.${col} -> ${ref}`, r[0].n)
}

console.log('\n=== FACTURAS ORIGEN ===')
linea('ambos null', (await q(`select count(*)::int n from facturas where contrato_id is null and oportunidad_id is null`))[0].n)
linea('ambos cargados', (await q(`select count(*)::int n from facturas where contrato_id is not null and oportunidad_id is not null`))[0].n)
linea('factura empresa != contrato empresa', (await q(`select count(*)::int n from facturas f join contratos ct on ct.id=f.contrato_id where ct.empresa_id<>f.empresa_id`))[0].n)
linea('factura empresa != oportunidad empresa', (await q(`select count(*)::int n from facturas f join oportunidades o on o.id=f.oportunidad_id where o.empresa_id<>f.empresa_id`))[0].n)
linea('factura de oportunidad no ganada/no implementacion', (await q(`select count(*)::int n from facturas f join oportunidades o on o.id=f.oportunidad_id where o.etapa<>'ganada' or o.tipo<>'implementacion'`))[0].n)

console.log('\n=== COBROS vs FACTURA ===')
linea('cobros sin factura', (await q(`select count(*)::int n from cobros x where not exists(select 1 from facturas f where f.id=x.factura_id)`))[0].n)
const over = await q(`select f.id, f.numero, f.monto_centavos::text m, sum(c.monto_centavos)::text s from facturas f join cobros c on c.factura_id=f.id group by f.id having sum(c.monto_centavos) > f.monto_centavos limit 5`)
linea('facturas sobrecobradas', over.length); console.log(over)
linea('cobros con moneda != factura', (await q(`select count(*)::int n from cobros c join facturas f on f.id=c.factura_id where c.moneda<>f.moneda`))[0].n)

console.log('\n=== ESTADO / SALDO ===')
for (const [et,cond] of [
  ['pagada','saldo_centavos <> 0'],
  ['pendiente','saldo_centavos <= 0'],
  ['pendiente','cantidad_cobros > 0'],
  ['parcial','cantidad_cobros = 0 or saldo_centavos <= 0'],
  ['vencida','saldo_centavos <= 0'],
  ['incobrable','saldo_centavos <= 0'],
]) {
  const r = await q(`select count(*)::int n, (array_agg(factura_id::text))[1:5] ids from v_saldo_facturas where estado='${et}' and (${cond})`)
  linea(`${et} viola [${cond}]`, [r[0].n, r[0].ids])
}
linea('vencida con fecha_vencimiento >= hoy', (await q(`select count(*)::int n from facturas where estado='vencida' and fecha_vencimiento >= date '2026-08-18'`))[0].n)
linea('pendiente con fecha_vencimiento < hoy', (await q(`select count(*)::int n from facturas where estado='pendiente' and fecha_vencimiento < date '2026-08-18'`))[0].n)
linea('saldo negativo', (await q(`select count(*)::int n from v_saldo_facturas where saldo_centavos<0`))[0].n)

console.log('\n=== MONTOS ===')
linea('facturas monto<=0', (await q(`select count(*)::int n from facturas where monto_centavos<=0`))[0].n)
linea('contratos abono<=0', (await q(`select count(*)::int n from contratos where abono_mensual_centavos<=0`))[0].n)
linea('oportunidades monto<=0', (await q(`select count(*)::int n from oportunidades where monto_centavos<=0`))[0].n)
linea('cobros monto<=0', (await q(`select count(*)::int n from cobros where monto_centavos<=0`))[0].n)
linea('campanias presupuesto<=0', (await q(`select count(*)::int n from campanias where presupuesto_centavos<=0`))[0].n)
linea('acciones costo<0', (await q(`select count(*)::int n from acciones_comerciales where costo_centavos<0`))[0].n)

console.log('\n=== MONEDAS NULL ===')
for (const [t,col] of [['facturas','moneda'],['cobros','moneda'],['contratos','moneda'],['oportunidades','moneda'],['campanias','moneda'],['acciones_comerciales','moneda'],['empresas','moneda_contrato']]) {
  linea(`${t}.${col} null`, (await q(`select count(*)::int n from ${t} where ${col} is null`))[0].n)
}

console.log('\n=== TIPOS DE COLUMNA DE PLATA ===')
console.log(await q(`select table_name, column_name, data_type from information_schema.columns where table_schema='public' and (column_name like '%centavos%') order by 1,2`))

console.log('\n=== MONEDA COHERENTE ===')
linea('facturas moneda != contrato moneda', (await q(`select count(*)::int n from facturas f join contratos ct on ct.id=f.contrato_id where f.moneda<>ct.moneda`))[0].n)
linea('facturas moneda != oportunidad moneda', (await q(`select count(*)::int n from facturas f join oportunidades o on o.id=f.oportunidad_id where f.moneda<>o.moneda`))[0].n)
linea('contratos moneda != empresa.moneda_contrato', (await q(`select count(*)::int n from contratos ct join empresas e on e.id=ct.empresa_id where ct.moneda<>e.moneda_contrato`))[0].n)

await c.end()
