/**
 * Seed de Kaudal CRM.
 *
 *   npx tsx scripts/seed.ts             carga, aborta si ya hay datos
 *   npx tsx scripts/seed.ts --reset     limpia en orden inverso y recarga
 *   npx tsx scripts/seed.ts --dry-run   genera y audita en memoria, sin tocar la base
 *
 * Todo lo que escribe en Postgres va en UNA transaccion: o entran las diez
 * tablas o no entra ninguna. Nunca queda la base a medio sembrar.
 *
 * La generacion vive en lib/generador.ts. Este archivo hace tres cosas:
 * verificar el dataset, escribirlo y dar de alta el usuario demo.
 *
 * @faker-js/faker se importa unicamente desde scripts/. Si alguna vez aparece
 * un import de faker bajo src/, se va derecho al bundle de produccion.
 */

import 'dotenv/config'

import type { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'

import { contarFilas, insertarEnLote } from './lib/db.ts'
import type { ValorSql } from './lib/db.ts'
import { conectar } from './lib/db.ts'
import { generar } from './lib/generador.ts'
import type { Dataset } from './lib/generador.ts'
import { cuitEsValido } from './lib/argentina.ts'

const TABLAS = [
  'empresas',
  'contactos',
  'campanias',
  'oportunidades',
  'contratos',
  'facturas',
  'cobros',
  'acciones_comerciales',
  'ipc_mensual',
  'tipo_cambio',
] as const

/** Orden inverso al de dependencias: los hijos primero, si no el FK restrict corta. */
const ORDEN_DE_BORRADO = [
  'cobros',
  'facturas',
  'acciones_comerciales',
  'contratos',
  'oportunidades',
  'contactos',
  'campanias',
  'empresas',
  'ipc_mensual',
  'tipo_cambio',
] as const

// ---------------------------------------------------------------------------
// Formateo para el informe de consola
// ---------------------------------------------------------------------------

const pesos = (centavos: number): string =>
  `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(centavos / 100))}`

const porcentaje = (fraccion: number): string => `${(fraccion * 100).toFixed(1)}%`

/** Percentil por el metodo del indice mas cercano, sobre la lista ordenada. */
function percentil(valores: readonly number[], fraccion: number): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const posicion = Math.min(ordenados.length - 1, Math.max(0, Math.round(fraccion * (ordenados.length - 1))))
  return ordenados[posicion] ?? 0
}

function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  if (ordenados.length % 2 === 1) return ordenados[medio] ?? 0
  return ((ordenados[medio - 1] ?? 0) + (ordenados[medio] ?? 0)) / 2
}

// ---------------------------------------------------------------------------
// Verificaciones sobre el dataset generado
// ---------------------------------------------------------------------------

/**
 * Dos clases de verificacion:
 *
 * - `integridad`: si falla, el dataset esta MAL y no se escribe nada. FK
 *   colgados, cadena temporal, plata que no cierra.
 * - `forma`: verosimilitud de las distribuciones. Si queda fuera de banda hay
 *   que mirarlo, pero no es motivo para bloquear una carga: los datos son
 *   consistentes igual.
 */
type Verificacion = { descripcion: string; ok: boolean; detalle: string; clase: 'integridad' | 'forma' }

function verificar(datos: Dataset): Verificacion[] {
  const resultados: Verificacion[] = []
  const agregar = (descripcion: string, ok: boolean, detalle: string): void => {
    resultados.push({ descripcion, ok, detalle, clase: 'integridad' })
  }
  const agregarForma = (descripcion: string, ok: boolean, detalle: string): void => {
    resultados.push({ descripcion, ok, detalle, clase: 'forma' })
  }

  const empresaPorId = new Map(datos.empresas.map((e) => [e.id, e]))
  const contratoPorId = new Map(datos.contratos.map((c) => [c.id, c]))
  const oportunidadPorId = new Map(datos.oportunidades.map((o) => [o.id, o]))
  const facturaPorId = new Map(datos.facturas.map((f) => [f.id, f]))

  // --- Integridad referencial -----------------------------------------------
  const colgados =
    datos.contactos.filter((c) => !empresaPorId.has(c.empresa_id)).length +
    datos.oportunidades.filter((o) => !empresaPorId.has(o.empresa_id)).length +
    datos.contratos.filter((c) => !empresaPorId.has(c.empresa_id)).length +
    datos.facturas.filter((f) => !empresaPorId.has(f.empresa_id)).length +
    datos.cobros.filter((c) => !facturaPorId.has(c.factura_id)).length +
    datos.acciones.filter((a) => !empresaPorId.has(a.empresa_id)).length
  agregar('Cero FK colgados', colgados === 0, `${colgados} referencias rotas`)

  const huerfanas = datos.facturas.filter((f) => {
    const porContrato = f.contrato_id !== null && contratoPorId.has(f.contrato_id)
    const porOportunidad = f.oportunidad_id !== null && oportunidadPorId.has(f.oportunidad_id)
    return porContrato === porOportunidad // ni las dos ni ninguna: exactamente una
  }).length
  agregar('Cero facturas huerfanas', huerfanas === 0, `${huerfanas} sin origen unico`)

  // --- Cadena temporal ------------------------------------------------------
  const oportunidadesMalOrdenadas = datos.oportunidades.filter((o) => {
    const empresa = empresaPorId.get(o.empresa_id)
    if (empresa === undefined) return true
    if (o.fecha_creacion <= empresa.fecha_alta) return true
    if (o.fecha_cierre_estimada < o.fecha_creacion) return true
    if (o.fecha_cierre_real !== null && o.fecha_cierre_real < o.fecha_creacion) return true
    const cerrada = o.etapa === 'ganada' || o.etapa === 'perdida'
    return cerrada !== (o.fecha_cierre_real !== null)
  }).length
  agregar(
    'alta de empresa < creacion < cierre de oportunidad',
    oportunidadesMalOrdenadas === 0,
    `${oportunidadesMalOrdenadas} oportunidades fuera de orden`,
  )

  const facturasMalOrdenadas = datos.facturas.filter((f) => {
    if (f.fecha_vencimiento < f.fecha_emision) return true
    if (f.fecha_emision > datos.diagnostico.hoy) return true
    if (f.contrato_id !== null) {
      const contrato = contratoPorId.get(f.contrato_id)
      if (contrato === undefined || f.fecha_emision < contrato.fecha_inicio) return true
    }
    if (f.oportunidad_id !== null) {
      const oportunidad = oportunidadPorId.get(f.oportunidad_id)
      const cierre = oportunidad?.fecha_cierre_real
      if (cierre === undefined || cierre === null || f.fecha_emision < cierre) return true
    }
    return false
  }).length
  agregar(
    'cierre <= emision <= hoy, y emision < vencimiento',
    facturasMalOrdenadas === 0,
    `${facturasMalOrdenadas} facturas fuera de orden`,
  )

  const cobrosMalOrdenados = datos.cobros.filter((c) => {
    const factura = facturaPorId.get(c.factura_id)
    if (factura === undefined) return true
    if (c.fecha < factura.fecha_vencimiento) return true
    if (c.fecha > datos.diagnostico.hoy) return true
    return c.moneda !== factura.moneda
  }).length
  agregar(
    'vencimiento <= cobro <= hoy, misma moneda',
    cobrosMalOrdenados === 0,
    `${cobrosMalOrdenados} cobros fuera de orden`,
  )

  const contactoPorId = new Map(datos.contactos.map((c) => [c.id, c]))
  const campaniaPorId = new Map(datos.campanias.map((c) => [c.id, c]))

  const contratosMalOrdenados = datos.contratos.filter((c) => {
    const empresa = empresaPorId.get(c.empresa_id)
    if (empresa === undefined) return true
    if (c.fecha_inicio < empresa.fecha_alta) return true
    if (c.fecha_fin !== null && c.fecha_fin < c.fecha_inicio) return true
    if (c.estado === 'cancelado') return c.motivo_baja === null || c.fecha_fin === null
    return c.motivo_baja !== null
  }).length
  agregar(
    'Contratos: inicio >= alta, y baja con fecha y motivo',
    contratosMalOrdenados === 0,
    `${contratosMalOrdenados} contratos incoherentes`,
  )

  const accionesIncoherentes = datos.acciones.filter((a) => {
    const empresa = empresaPorId.get(a.empresa_id)
    if (empresa === undefined) return true
    if (a.fecha < empresa.fecha_alta || a.fecha > datos.diagnostico.hoy) return true
    if (a.contacto_id !== null && contactoPorId.get(a.contacto_id)?.empresa_id !== a.empresa_id) return true
    if (a.oportunidad_id !== null && oportunidadPorId.get(a.oportunidad_id)?.empresa_id !== a.empresa_id) return true
    if (a.campania_id !== null) {
      const campania = campaniaPorId.get(a.campania_id)
      if (campania === undefined) return true
      if (a.fecha < campania.fecha_inicio || a.fecha > campania.fecha_fin) return true
    }
    return false
  }).length
  agregar(
    'Acciones dentro de la vida de la cuenta y de su campania',
    accionesIncoherentes === 0,
    `${accionesIncoherentes} acciones incoherentes`,
  )

  // --- Plata ----------------------------------------------------------------
  const montosNoPositivos =
    datos.facturas.filter((f) => f.monto_centavos <= 0).length +
    datos.cobros.filter((c) => c.monto_centavos <= 0).length +
    datos.contratos.filter((c) => c.abono_mensual_centavos <= 0).length +
    datos.oportunidades.filter((o) => o.monto_centavos <= 0).length
  agregar('Ningun importe <= 0', montosNoPositivos === 0, `${montosNoPositivos} importes invalidos`)

  const cobradoPorFactura = new Map<string, number>()
  for (const cobro of datos.cobros) {
    cobradoPorFactura.set(cobro.factura_id, (cobradoPorFactura.get(cobro.factura_id) ?? 0) + cobro.monto_centavos)
  }
  const sobrecobradas = datos.facturas.filter(
    (f) => (cobradoPorFactura.get(f.id) ?? 0) > f.monto_centavos,
  ).length
  agregar('Suma de cobros <= monto de la factura', sobrecobradas === 0, `${sobrecobradas} facturas sobrecobradas`)

  const estadosIncoherentes = datos.facturas.filter((f) => {
    const cobrado = cobradoPorFactura.get(f.id) ?? 0
    if (f.estado === 'pagada') return cobrado !== f.monto_centavos
    if (f.estado === 'parcial') return cobrado <= 0 || cobrado >= f.monto_centavos
    if (f.estado === 'vencida') return cobrado !== 0 || f.fecha_vencimiento >= datos.diagnostico.hoy
    if (f.estado === 'pendiente') return cobrado !== 0 || f.fecha_vencimiento < datos.diagnostico.hoy
    return cobrado >= f.monto_centavos // incobrable
  }).length
  agregar(
    'Estado de factura coherente con sus cobros',
    estadosIncoherentes === 0,
    `${estadosIncoherentes} estados incoherentes`,
  )

  // --- Mora -----------------------------------------------------------------
  const vencidas = datos.facturas.filter((f) => f.estado === 'vencida').length
  const incobrables = datos.facturas.filter((f) => f.estado === 'incobrable').length
  const pctVencidas = vencidas / datos.facturas.length
  const pctIncobrables = incobrables / datos.facturas.length
  agregarForma(
    'Vencidas cerca del 15% (+/- 3 puntos)',
    Math.abs(pctVencidas - 0.15) <= 0.03,
    `${porcentaje(pctVencidas)} (${vencidas} facturas)`,
  )
  agregarForma(
    'Incobrables cerca del 4% (+/- 3 puntos)',
    Math.abs(pctIncobrables - 0.04) <= 0.03,
    `${porcentaje(pctIncobrables)} (${incobrables} facturas)`,
  )

  // Concentracion de la mora: cuantas empresas explican el 80% del saldo caido.
  const saldoCaidoPorEmpresa = new Map<string, number>()
  for (const factura of datos.facturas) {
    if (factura.estado !== 'vencida' && factura.estado !== 'incobrable' && factura.estado !== 'parcial') continue
    const saldo = factura.monto_centavos - (cobradoPorFactura.get(factura.id) ?? 0)
    saldoCaidoPorEmpresa.set(factura.empresa_id, (saldoCaidoPorEmpresa.get(factura.empresa_id) ?? 0) + saldo)
  }
  const saldosCaidos = [...saldoCaidoPorEmpresa.values()].sort((a, b) => b - a)
  const totalCaido = saldosCaidos.reduce((a, b) => a + b, 0)
  let acumulado = 0
  let empresasPara80 = 0
  for (const saldo of saldosCaidos) {
    if (acumulado >= totalCaido * 0.8) break
    acumulado += saldo
    empresasPara80 += 1
  }
  agregarForma(
    'Mora concentrada en pocas cuentas',
    empresasPara80 <= 20,
    `${empresasPara80} empresas explican el 80% del saldo caido`,
  )

  // --- Concentracion de cartera --------------------------------------------
  const facturacion = datos.diagnostico.facturacion12mPorEmpresa
  const totalFacturado = facturacion.reduce((a, b) => a + b, 0)
  const hhi = facturacion.reduce((suma, valor) => {
    const share = valor / totalFacturado
    return suma + (share * 100) ** 2
  }, 0)
  // Banda "moderada" del skill metricas-financieras, sostenida por las cuentas
  // ancla (skill seed-financiero, 2 bis). La log-normal sola daba 389.
  agregarForma(
    'HHI entre 1500 y 1800',
    hhi >= 1500 && hhi <= 1800,
    `HHI = ${Math.round(hhi)} sobre ${facturacion.length} cuentas con facturacion en 12 meses`,
  )

  // La forma de la cola se mide SIN las anclas. Sobre la cartera completa,
  // maximo/mediana queda determinado por el share de las anclas y no por la
  // distribucion (su piso matematico con estas anclas es 41,4), asi que se
  // informa en el resumen pero no se aprueba (skill seed-financiero, seccion 2).
  const noAncla = datos.diagnostico.facturacion12mNoAncla
  const p90SobreMediana = mediana(noAncla) === 0 ? 0 : percentil(noAncla, 0.9) / mediana(noAncla)
  agregarForma(
    'p90/mediana de las cuentas no ancla, entre 2,5 y 4,5',
    p90SobreMediana >= 2.5 && p90SobreMediana <= 4.5,
    `p90/mediana = ${p90SobreMediana.toFixed(2)} sobre ${noAncla.length} cuentas de la cola`,
  )

  const anclas = datos.diagnostico.anclas
  const anclasFueraDeBanda = anclas.filter((a) => a.share < 0.15 || a.share > 0.25)
  agregarForma(
    'Cada cuenta ancla pesa entre 15% y 25% de la facturacion',
    anclas.length >= 2 && anclasFueraDeBanda.length === 0,
    `${anclas.length} anclas: ${anclas.map((a) => porcentaje(a.share)).join(' / ')}`,
  )
  agregarForma(
    'Una sola ancla dentro del grupo de morosas',
    anclas.filter((a) => a.esProblematica).length === 1,
    `${anclas.filter((a) => a.esProblematica).length} anclas problematicas`,
  )

  // --- Series macro ---------------------------------------------------------
  let ipcInconsistente = 0
  datos.ipc.forEach((fila, posicion) => {
    if (posicion === 0) return
    const anterior = datos.ipc[posicion - 1]
    if (anterior === undefined) return
    const esperado = anterior.indice * (1 + fila.variacion_mensual)
    if (Math.abs(esperado - fila.indice) / fila.indice > 0.001) ipcInconsistente += 1
  })
  agregar(
    'indice[n] = indice[n-1] x (1 + variacion[n])',
    ipcInconsistente === 0,
    `${ipcInconsistente} meses inconsistentes sobre ${datos.ipc.length}`,
  )

  // --- MRR ------------------------------------------------------------------
  const { mrrDesdeContratosCentavos: mrrContratos, mrrDesdeFacturasCentavos: mrrFacturas } = datos.diagnostico
  agregar(
    'MRR de contratos = MRR de las facturas de abono del mes',
    mrrContratos === mrrFacturas,
    `contratos ${pesos(mrrContratos)} vs facturas ${pesos(mrrFacturas)}`,
  )

  // --- Datos argentinos -----------------------------------------------------
  const cuitsInvalidos = datos.empresas.filter((e) => !cuitEsValido(e.cuit)).length
  agregar('CUIT con digito verificador valido', cuitsInvalidos === 0, `${cuitsInvalidos} invalidos`)

  const cuitsRepetidos = datos.empresas.length - new Set(datos.empresas.map((e) => e.cuit)).size
  agregar('CUIT unicos', cuitsRepetidos === 0, `${cuitsRepetidos} repetidos`)

  const numerosRepetidos = datos.facturas.length - new Set(datos.facturas.map((f) => f.numero)).size
  agregar('Numeros de factura unicos', numerosRepetidos === 0, `${numerosRepetidos} repetidos`)

  return resultados
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

function informar(datos: Dataset): boolean {
  const conteos: ReadonlyArray<readonly [string, number, string]> = [
    ['empresas', datos.empresas.length, '120'],
    ['contactos', datos.contactos.length, '~260'],
    ['campanias', datos.campanias.length, '24'],
    ['oportunidades', datos.oportunidades.length, '180'],
    ['contratos', datos.contratos.length, '82 (70 activos + 12 cancelados)'],
    ['facturas', datos.facturas.length, '~1400'],
    ['cobros', datos.cobros.length, '~1200'],
    ['acciones_comerciales', datos.acciones.length, '~900'],
    ['ipc_mensual', datos.ipc.length, '36'],
    ['tipo_cambio', datos.tipoCambio.length, '~1080 dias x 6 casas'],
  ]

  console.log('\nTotales por tabla')
  for (const [tabla, cantidad, objetivo] of conteos) {
    console.log(`  ${tabla.padEnd(22)} ${String(cantidad).padStart(6)}   objetivo ${objetivo}`)
  }

  const porEstadoComercial = new Map<string, number>()
  for (const empresa of datos.empresas) {
    porEstadoComercial.set(empresa.estado_comercial, (porEstadoComercial.get(empresa.estado_comercial) ?? 0) + 1)
  }
  console.log('\nEmpresas por estado comercial')
  for (const [estado, cantidad] of porEstadoComercial) {
    console.log(`  ${estado.padEnd(26)} ${String(cantidad).padStart(4)}  ${porcentaje(cantidad / datos.empresas.length)}`)
  }

  const porEtapa = new Map<string, number>()
  for (const oportunidad of datos.oportunidades) {
    porEtapa.set(oportunidad.etapa, (porEtapa.get(oportunidad.etapa) ?? 0) + 1)
  }
  console.log('\nOportunidades por etapa')
  for (const [etapa, cantidad] of [...porEtapa].sort()) {
    console.log(`  ${etapa.padEnd(26)} ${String(cantidad).padStart(4)}`)
  }

  const porEstadoFactura = new Map<string, number>()
  for (const factura of datos.facturas) {
    porEstadoFactura.set(factura.estado, (porEstadoFactura.get(factura.estado) ?? 0) + 1)
  }
  console.log('\nFacturas por estado')
  for (const [estado, cantidad] of [...porEstadoFactura].sort()) {
    console.log(
      `  ${estado.padEnd(26)} ${String(cantidad).padStart(4)}  ${porcentaje(cantidad / datos.facturas.length)}`,
    )
  }

  const activos = datos.contratos.filter((c) => c.estado === 'activo').length
  const cancelados = datos.contratos.filter((c) => c.estado === 'cancelado').length
  const deAbono = datos.facturas.filter((f) => f.contrato_id !== null).length
  const deHito = datos.facturas.filter((f) => f.oportunidad_id !== null).length
  const conCampania = datos.acciones.filter((a) => a.campania_id !== null).length
  const decisores = datos.contactos.filter((c) => c.es_decisor).length

  console.log('')
  console.log('Cuentas ancla')
  for (const ancla of datos.diagnostico.anclas) {
    console.log(
      `  ${ancla.razonSocial.padEnd(34)} ${porcentaje(ancla.share).padStart(6)} de la facturacion 12m` +
        `   ${pesos(ancla.facturacion12mCentavos).padStart(18)}${ancla.esProblematica ? '   [morosa]' : ''}`,
    )
  }

  const facturacionTodas = datos.diagnostico.facturacion12mPorEmpresa
  const noAncla = datos.diagnostico.facturacion12mNoAncla
  const medianaNoAncla = mediana(noAncla)
  console.log(
    `  maximo/mediana de la cartera completa   ${(Math.max(...facturacionTodas) / mediana(facturacionTodas)).toFixed(1)}` +
      '   (informativo: lo fija el share de las anclas, no la forma de la cola)',
  )
  console.log(
    `  p90/mediana de la cola no ancla         ${(medianaNoAncla === 0 ? 0 : percentil(noAncla, 0.9) / medianaNoAncla).toFixed(2)}` +
      `   (mediana ${pesos(medianaNoAncla)} · p90 ${pesos(percentil(noAncla, 0.9))})`,
  )

  console.log('')
  console.log('Composicion')
  console.log(`  contratos activos / cancelados        ${activos} / ${cancelados}`)
  console.log(`  facturas de abono / de hito           ${deAbono} / ${deHito}`)
  console.log(`  oportunidades implementacion / expansion  ${datos.oportunidades.filter((o) => o.tipo === 'implementacion').length} / ${datos.oportunidades.filter((o) => o.tipo === 'expansion').length}`)
  console.log(`  acciones atribuidas a una campania    ${conCampania} (${porcentaje(conCampania / datos.acciones.length)})`)
  console.log(`  contactos decisores                   ${decisores} (${porcentaje(decisores / datos.contactos.length)})`)

  const primeraEmision = datos.facturas
    .map((f) => f.fecha_emision)
    .sort((a, b) => a.localeCompare(b))
    .at(0)
  const facturadoArs = datos.facturas
    .filter((f) => f.moneda === 'ARS')
    .reduce((total, f) => total + f.monto_centavos, 0)
  const facturadoUsd = datos.facturas
    .filter((f) => f.moneda === 'USD')
    .reduce((total, f) => total + f.monto_centavos, 0)

  console.log('\nPlata')
  console.log(`  MRR actual (contratos activos, normalizado a ARS)  ${pesos(datos.diagnostico.mrrDesdeContratosCentavos)}`)
  console.log(`  facturado historico en ARS                         ${pesos(facturadoArs)}`)
  console.log(`  facturado historico en USD                         USD ${Math.round(facturadoUsd / 100).toLocaleString('es-AR')}`)
  console.log(`  ventana                                            ${primeraEmision ?? '-'} a ${datos.diagnostico.hoy}`)
  console.log(`  MEP venta usado para normalizar                    ${pesos(datos.diagnostico.mepVentaHoyCentavos)}`)

  console.log('')
  console.log('Verificaciones de integridad (si alguna falla, no se escribe nada)')
  const verificaciones = verificar(datos)
  let integridadOk = true
  for (const { descripcion, ok, detalle, clase } of verificaciones) {
    if (clase !== 'integridad') continue
    if (!ok) integridadOk = false
    console.log(`  [${ok ? 'ok' : 'NO'}] ${descripcion.padEnd(52)} ${detalle}`)
  }

  console.log('')
  console.log('Verificaciones de forma (avisan, no bloquean la carga)')
  for (const { descripcion, ok, detalle, clase } of verificaciones) {
    if (clase !== 'forma') continue
    console.log(`  [${ok ? 'ok' : ' !'}] ${descripcion.padEnd(52)} ${detalle}`)
  }

  return integridadOk
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

function fecha(valor: string | null): ValorSql {
  return valor
}

async function escribir(cliente: Client, datos: Dataset): Promise<void> {
  await insertarEnLote(
    cliente,
    'empresas',
    ['id', 'razon_social', 'cuit', 'sector', 'tamanio', 'estado_comercial', 'moneda_contrato', 'fecha_alta', 'owner_comercial', 'ciudad', 'provincia'],
    datos.empresas.map((e) => [
      e.id,
      e.razon_social,
      e.cuit,
      e.sector,
      e.tamanio,
      e.estado_comercial,
      e.moneda_contrato,
      e.fecha_alta,
      e.owner_comercial,
      e.ciudad,
      e.provincia,
    ]),
  )

  await insertarEnLote(
    cliente,
    'contactos',
    ['id', 'empresa_id', 'nombre', 'apellido', 'cargo', 'email', 'telefono', 'es_decisor'],
    datos.contactos.map((c) => [c.id, c.empresa_id, c.nombre, c.apellido, c.cargo, c.email, c.telefono, c.es_decisor]),
  )

  await insertarEnLote(
    cliente,
    'campanias',
    ['id', 'nombre', 'canal', 'presupuesto_centavos', 'moneda', 'fecha_inicio', 'fecha_fin'],
    datos.campanias.map((c) => [c.id, c.nombre, c.canal, c.presupuesto_centavos, c.moneda, c.fecha_inicio, c.fecha_fin]),
  )

  await insertarEnLote(
    cliente,
    'oportunidades',
    ['id', 'empresa_id', 'titulo', 'monto_centavos', 'moneda', 'etapa', 'probabilidad', 'fecha_creacion', 'fecha_cierre_estimada', 'fecha_cierre_real', 'origen', 'tipo'],
    datos.oportunidades.map((o) => [
      o.id,
      o.empresa_id,
      o.titulo,
      o.monto_centavos,
      o.moneda,
      o.etapa,
      o.probabilidad,
      o.fecha_creacion,
      o.fecha_cierre_estimada,
      fecha(o.fecha_cierre_real),
      o.origen,
      o.tipo,
    ]),
  )

  await insertarEnLote(
    cliente,
    'contratos',
    ['id', 'empresa_id', 'abono_mensual_centavos', 'moneda', 'fecha_inicio', 'fecha_fin', 'estado', 'motivo_baja'],
    datos.contratos.map((c) => [
      c.id,
      c.empresa_id,
      c.abono_mensual_centavos,
      c.moneda,
      c.fecha_inicio,
      fecha(c.fecha_fin),
      c.estado,
      c.motivo_baja,
    ]),
  )

  await insertarEnLote(
    cliente,
    'facturas',
    ['id', 'empresa_id', 'contrato_id', 'oportunidad_id', 'numero', 'fecha_emision', 'fecha_vencimiento', 'monto_centavos', 'moneda', 'estado'],
    datos.facturas.map((f) => [
      f.id,
      f.empresa_id,
      f.contrato_id,
      f.oportunidad_id,
      f.numero,
      f.fecha_emision,
      f.fecha_vencimiento,
      f.monto_centavos,
      f.moneda,
      f.estado,
    ]),
  )

  await insertarEnLote(
    cliente,
    'cobros',
    ['id', 'factura_id', 'fecha', 'monto_centavos', 'moneda', 'medio'],
    datos.cobros.map((c) => [c.id, c.factura_id, c.fecha, c.monto_centavos, c.moneda, c.medio]),
  )

  await insertarEnLote(
    cliente,
    'acciones_comerciales',
    ['id', 'empresa_id', 'contacto_id', 'oportunidad_id', 'campania_id', 'tipo', 'fecha', 'costo_centavos', 'moneda', 'resultado', 'notas'],
    datos.acciones.map((a) => [
      a.id,
      a.empresa_id,
      a.contacto_id,
      a.oportunidad_id,
      a.campania_id,
      a.tipo,
      a.fecha,
      a.costo_centavos,
      a.moneda,
      a.resultado,
      a.notas,
    ]),
  )

  await insertarEnLote(
    cliente,
    'ipc_mensual',
    ['periodo', 'indice', 'variacion_mensual'],
    datos.ipc.map((fila) => [fila.periodo, fila.indice, fila.variacion_mensual]),
  )

  await insertarEnLote(
    cliente,
    'tipo_cambio',
    ['fecha', 'casa', 'compra_centavos', 'venta_centavos'],
    datos.tipoCambio.map((fila) => [fila.fecha, fila.casa, fila.compra_centavos, fila.venta_centavos]),
  )
}

// ---------------------------------------------------------------------------
// Usuario demo (lo unico que no se puede hacer por SQL)
// ---------------------------------------------------------------------------

async function crearUsuarioDemo(): Promise<void> {
  const url = process.env['VITE_SUPABASE_URL']
  const secreta = process.env['SUPABASE_SECRET_KEY']

  if (url === undefined || url === '' || secreta === undefined || secreta === '' || secreta.startsWith('sb_secret_xxxx')) {
    console.log('\nUsuario demo: falta VITE_SUPABASE_URL o SUPABASE_SECRET_KEY en .env, se saltea.')
    return
  }

  const admin = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.admin.createUser({
    email: 'demo@demo.com',
    password: 'pia2026',
    // Sin confirmacion por mail: el corrector tiene que poder entrar sin acceso
    // a una casilla (rule supabase.md, seccion Auth).
    email_confirm: true,
  })

  if (error === null) {
    console.log('\nUsuario demo creado: demo@demo.com / pia2026')
    return
  }
  if (/already|registered|exists/i.test(error.message)) {
    console.log('\nUsuario demo: ya existia, no se toco.')
    return
  }
  console.error(`\nUsuario demo: no se pudo crear (${error.message}). El resto del seed quedo cargado.`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const argumentos = new Set(process.argv.slice(2))
  const reset = argumentos.has('--reset')
  const dryRun = argumentos.has('--dry-run')

  console.log('Generando dataset determinista (semilla 2026)...')
  const desde = Date.now()
  const datos = generar()
  console.log(`Dataset generado en ${Date.now() - desde} ms.`)

  const todoOk = informar(datos)

  if (dryRun) {
    console.log('\n--dry-run: no se toco la base.')
    if (!todoOk) process.exitCode = 1
    return
  }

  if (!todoOk) {
    throw new Error('El dataset no paso sus verificaciones de integridad. No se escribe nada.')
  }

  const cliente = await conectar()
  try {
    if (!reset) {
      for (const tabla of TABLAS) {
        const existentes = await contarFilas(cliente, tabla)
        if (existentes > 0) {
          throw new Error(
            `La tabla ${tabla} ya tiene ${existentes} filas. Corre "npm run seed:reset" si querés limpiar y recargar.`,
          )
        }
      }
    }

    await cliente.query('begin')

    if (reset) {
      console.log('\nLimpiando en orden inverso de dependencias...')
      for (const tabla of ORDEN_DE_BORRADO) {
        const resultado = await cliente.query(`delete from public.${tabla}`)
        console.log(`  ${tabla.padEnd(22)} ${String(resultado.rowCount ?? 0).padStart(6)} filas borradas`)
      }
    }

    console.log('\nInsertando en lote...')
    const desdeInsert = Date.now()
    await escribir(cliente, datos)
    await cliente.query('commit')
    console.log(`Commit ok en ${Date.now() - desdeInsert} ms.`)

    console.log('\nFilas en la base')
    for (const tabla of TABLAS) {
      console.log(`  ${tabla.padEnd(22)} ${String(await contarFilas(cliente, tabla)).padStart(6)}`)
    }

    const vista = await cliente.query<{ total: string; saldo: string }>(
      'select count(*)::text as total, coalesce(sum(saldo_centavos), 0)::text as saldo from public.v_saldo_facturas where saldo_centavos > 0',
    )
    const fila = vista.rows[0]
    if (fila !== undefined) {
      console.log(`\nv_saldo_facturas: ${fila.total} facturas con saldo, ${pesos(Number(fila.saldo))} pendientes (sin normalizar moneda)`)
    }
  } catch (error: unknown) {
    await cliente.query('rollback')
    throw error
  } finally {
    await cliente.end()
  }

  await crearUsuarioDemo()
}

main().catch((error: unknown) => {
  console.error('\nEl seed fallo y la transaccion se revirtio entera.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
