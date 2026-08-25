/**
 * Generador determinista del dataset de Kaudal CRM.
 *
 * No inserta nada: arma el dataset completo en memoria y lo devuelve. Asi el
 * seed puede correrse con --dry-run para auditar volumen, distribuciones y
 * cadena temporal sin tocar la base.
 *
 * Las tres reglas que gobiernan todo el archivo (skill seed-financiero):
 *
 *  1. Cadena temporal estricta. Cada fecha se deriva de la anterior, nunca se
 *     sortea suelta:
 *       alta < creacion de oportunidad < cierre < emision < vencimiento <= cobro
 *     Como el punto de partida real es el contrato, varias cadenas se generan
 *     HACIA ATRAS desde la fecha de inicio del contrato.
 *
 *  2. Nada huerfano. Toda factura nace de un contrato o de una oportunidad de
 *     implementacion ganada. Todo cobro nace de una factura.
 *
 *  3. La mora es una propiedad del cliente, no un dado que se tira por factura.
 *     Cada empresa lleva un factorMora asignado al crearla, y ese factor
 *     gobierna el atraso de todos sus cobros y su probabilidad de churn.
 */

import {
  CARGOS,
  OWNERS,
  dominioDe,
  generarCuit,
  generarRazonSocial,
  generarTelefono,
  generarUbicacion,
} from './argentina.ts'
import {
  barajar,
  chance,
  elegir,
  elegirPonderado,
  entero,
  exigir,
  faker,
  logNormal,
  normal,
  sembrar,
  uniforme,
  uuid,
} from './aleatorio.ts'
import type { Fecha, Mes } from './fechas.ts'
import {
  diasEntre,
  factorEstacional,
  maxFecha,
  mesDe,
  mesesEntre,
  minFecha,
  primerDia,
  sumarDias,
  sumarMeses,
} from './fechas.ts'
import { cargarMacro } from './macro.ts'
import type { FilaIpc, FilaTipoCambio } from './macro.ts'

// ---------------------------------------------------------------------------
// Enums del esquema, como uniones de literales
// ---------------------------------------------------------------------------

export type Moneda = 'ARS' | 'USD'
export type EstadoComercial =
  | 'prospecto'
  | 'potencial'
  | 'conversaciones_avanzadas'
  | 'cliente'
  | 'ex_cliente'
export type Tamanio = 'micro' | 'pyme' | 'corporativa'
export type Sector =
  | 'transporte_y_logistica'
  | 'distribucion_mayorista'
  | 'retail'
  | 'agro'
  | 'alimentos_y_bebidas'
  | 'manufactura'
  | 'construccion'
  | 'salud'
  | 'servicios_profesionales'
  | 'software_y_tecnologia'
export type Etapa =
  | 'prospecto'
  | 'calificado'
  | 'demo'
  | 'propuesta'
  | 'negociacion'
  | 'ganada'
  | 'perdida'
export type TipoOportunidad = 'implementacion' | 'expansion'
export type Canal =
  | 'email'
  | 'eventos'
  | 'linkedin'
  | 'google_ads'
  | 'contenido'
  | 'referidos'
  | 'telemarketing'
  | 'partners'
export type TipoAccion = 'email' | 'evento' | 'demo' | 'videollamada' | 'llamada' | 'visita'
export type ResultadoAccion = 'positivo' | 'neutro' | 'negativo' | 'sin_respuesta'
export type EstadoContrato = 'activo' | 'pausado' | 'cancelado'
export type MotivoBaja = 'impago' | 'reestructuracion' | 'cambio_de_proveedor' | 'cierre_de_operacion'
export type EstadoFactura = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'incobrable'
export type MedioCobro = 'transferencia' | 'cheque' | 'echeq' | 'debito'

// ---------------------------------------------------------------------------
// Filas, con los nombres de columna del esquema
// ---------------------------------------------------------------------------

export type Empresa = {
  id: string
  razon_social: string
  cuit: string
  sector: Sector
  tamanio: Tamanio
  estado_comercial: EstadoComercial
  moneda_contrato: Moneda
  fecha_alta: Fecha
  owner_comercial: string
  ciudad: string
  provincia: string
}

export type Contacto = {
  id: string
  empresa_id: string
  nombre: string
  apellido: string
  cargo: string
  email: string
  telefono: string
  es_decisor: boolean
}

export type Oportunidad = {
  id: string
  empresa_id: string
  titulo: string
  monto_centavos: number
  moneda: Moneda
  etapa: Etapa
  probabilidad: number
  fecha_creacion: Fecha
  fecha_cierre_estimada: Fecha
  fecha_cierre_real: Fecha | null
  origen: Canal
  tipo: TipoOportunidad
}

export type Campania = {
  id: string
  nombre: string
  canal: Canal
  presupuesto_centavos: number
  moneda: Moneda
  fecha_inicio: Fecha
  fecha_fin: Fecha
}

export type Accion = {
  id: string
  empresa_id: string
  contacto_id: string | null
  oportunidad_id: string | null
  campania_id: string | null
  tipo: TipoAccion
  fecha: Fecha
  costo_centavos: number
  moneda: Moneda
  resultado: ResultadoAccion
  notas: string | null
}

export type Contrato = {
  id: string
  empresa_id: string
  abono_mensual_centavos: number
  moneda: Moneda
  fecha_inicio: Fecha
  fecha_fin: Fecha | null
  estado: EstadoContrato
  motivo_baja: MotivoBaja | null
}

export type Factura = {
  id: string
  empresa_id: string
  contrato_id: string | null
  oportunidad_id: string | null
  numero: string
  fecha_emision: Fecha
  fecha_vencimiento: Fecha
  monto_centavos: number
  moneda: Moneda
  estado: EstadoFactura
}

export type Cobro = {
  id: string
  factura_id: string
  fecha: Fecha
  monto_centavos: number
  moneda: Moneda
  medio: MedioCobro
}

export type Dataset = {
  empresas: Empresa[]
  contactos: Contacto[]
  campanias: Campania[]
  oportunidades: Oportunidad[]
  contratos: Contrato[]
  facturas: Factura[]
  cobros: Cobro[]
  acciones: Accion[]
  ipc: readonly FilaIpc[]
  tipoCambio: readonly FilaTipoCambio[]
  /** Solo para el informe y las verificaciones; no va a ninguna tabla. */
  diagnostico: {
    hoy: Fecha
    mesInicial: Mes
    mesCorriente: Mes
    empresasProblematicas: number
    mepVentaHoyCentavos: number
    facturacion12mPorEmpresa: number[]
    /** Sin las anclas: es sobre esta cola que se mide si la log-normal sigue viva. */
    facturacion12mNoAncla: number[]
    facturacion12mTotalCentavos: number
    anclas: Ancla[]
    mrrDesdeContratosCentavos: number
    mrrDesdeFacturasCentavos: number
  }
}

/** Cuenta ancla: la que sostiene el HHI de la cartera (skill seed-financiero, 2 bis). */
export type Ancla = {
  empresaId: string
  razonSocial: string
  esProblematica: boolean
  facturacion12mCentavos: number
  share: number
}

// ---------------------------------------------------------------------------
// Parametros del negocio
// ---------------------------------------------------------------------------

/**
 * Fecha de corte. Fija a proposito: ningun hecho consumado puede ser posterior
 * y el dataset tiene que ser identico corrida tras corrida. Si se vuelve a
 * congelar datos-macro.json, se mueve esta constante junto con el.
 */
export const HOY: Fecha = '2026-08-18'

const REPARTO_ESTADOS: ReadonlyArray<readonly [EstadoComercial, number]> = [
  ['prospecto', 22],
  ['potencial', 20],
  ['conversaciones_avanzadas', 14],
  ['cliente', 54],
  ['ex_cliente', 10],
]

const SECTORES: ReadonlyArray<readonly [Sector, number, number]> = [
  // sector, peso en la cartera, multiplicador de abono (intensidad logistica)
  ['transporte_y_logistica', 16, 1.35],
  ['distribucion_mayorista', 14, 1.25],
  ['retail', 14, 1.2],
  ['agro', 11, 1.15],
  ['alimentos_y_bebidas', 10, 1.05],
  ['manufactura', 10, 1.0],
  ['construccion', 7, 0.9],
  ['salud', 6, 0.8],
  ['servicios_profesionales', 7, 0.7],
  ['software_y_tecnologia', 5, 0.65],
]

const MULTIPLICADOR_TAMANIO: Readonly<Record<Tamanio, number>> = {
  micro: 0.35,
  pyme: 1.0,
  corporativa: 4.5,
}

const CANALES: ReadonlyArray<readonly [Canal, number]> = [
  ['referidos', 20],
  ['eventos', 16],
  ['linkedin', 14],
  ['email', 13],
  ['google_ads', 12],
  ['partners', 10],
  ['contenido', 8],
  ['telemarketing', 7],
]

/** Probabilidad por etapa. Fuente unica: skill metricas-financieras. */
const PROBABILIDAD: Readonly<Record<Etapa, number>> = {
  prospecto: 0.05,
  calificado: 0.15,
  demo: 0.3,
  propuesta: 0.5,
  negociacion: 0.75,
  ganada: 1,
  perdida: 0,
}

/** Abono mediano de una pyme de sector neutro, en centavos de ARS de hoy. */
const ABONO_MEDIANO_CENTAVOS = 120_000_000

/** Costo tipico de cada accion, en centavos de ARS de hoy. */
const COSTO_ACCION: Readonly<Record<TipoAccion, number>> = {
  email: 800_000,
  llamada: 2_500_000,
  videollamada: 6_000_000,
  demo: 18_000_000,
  visita: 25_000_000,
  evento: 400_000_000,
}

// ---------------------------------------------------------------------------
// Estado interno del generador
// ---------------------------------------------------------------------------

type PerfilEmpresa = {
  empresa: Empresa
  factorMora: number
  plazoPagoDias: number
  caracteristicaTelefonica: string
  origen: Canal
  multiplicadorAbono: number
  contactos: Contacto[]
  oportunidades: Oportunidad[]
  ultimaActividad: Fecha
}

type Ajuste = { mes: Mes; deltaCentavos: number }

type PlanContrato = {
  contrato: Contrato
  perfil: PerfilEmpresa
  abonoFirmaCentavos: number
  mesInicio: Mes
  mesUltimoFacturado: Mes
  /** Expansiones ganadas y contracciones, con el mes desde el que rigen. */
  ajustes: Ajuste[]
}

/**
 * Peso objetivo de cada cuenta ancla sobre la facturacion de 12 meses.
 * Tres anclas en la banda 15-25% del skill dejan el HHI en 1500-1800, que es
 * la lectura "moderada" del skill metricas-financieras. Con solo la log-normal
 * el HHI daba ~400 y el KPI de concentracion no decia nada.
 */
const SHARE_OBJETIVO_ANCLA = [0.24, 0.225, 0.21] as const

/**
 * El dataset se genera DOS VECES, y no por descuido.
 *
 * Cuanto tiene que facturar un ancla para pesar el 24% de la cartera no se
 * sabe hasta que la cartera existe. La primera pasada mide cuanto factura el
 * resto; la segunda vuelve a generar todo con la escala ya resuelta.
 *
 * Se puede hacer porque la escala solo multiplica importes: no cambia ninguna
 * decision, no consume numeros aleatorios extra y el stream del RNG es
 * identico en las dos pasadas. Por eso las fechas, los estados y los conteos
 * de la pasada 2 son exactamente los de la pasada 1, con otros montos en tres
 * cuentas. Y por eso el dataset sigue siendo determinista.
 */
export function generar(): Dataset {
  const exploratoria = generarConEscalas(new Map())
  return generarConEscalas(resolverEscalasDeAncla(exploratoria))
}

function resolverEscalasDeAncla(exploratoria: Dataset): Map<string, number> {
  const escalas = new Map<string, number>()
  const { anclas, facturacion12mTotalCentavos } = exploratoria.diagnostico

  const objetivos = SHARE_OBJETIVO_ANCLA.slice(0, anclas.length)
  const sumaObjetivos = objetivos.reduce((total, objetivo) => total + objetivo, 0)
  const facturadoPorAnclas = anclas.reduce((total, ancla) => total + ancla.facturacion12mCentavos, 0)
  const resto = facturacion12mTotalCentavos - facturadoPorAnclas
  if (resto <= 0 || sumaObjetivos >= 1) return escalas

  // Si el resto de la cartera tiene que ser el (1 - suma de objetivos) del
  // total, el total queda determinado y de ahi sale cuanto factura cada ancla.
  const totalObjetivo = resto / (1 - sumaObjetivos)

  anclas.forEach((ancla, posicion) => {
    const objetivo = objetivos[posicion]
    if (objetivo === undefined || ancla.facturacion12mCentavos <= 0) return
    escalas.set(ancla.empresaId, (objetivo * totalObjetivo) / ancla.facturacion12mCentavos)
  })

  return escalas
}

function generarConEscalas(escalas: ReadonlyMap<string, number>): Dataset {
  sembrar()

  const macro = cargarMacro()
  const mesInicial = macro.primerMes
  const mesCorriente = mesDe(HOY)
  const mepHoy = macro.mepVenta(HOY)
  const indiceHoy = macro.indice(mesCorriente)

  /** Lleva un importe expresado en pesos de hoy a pesos nominales del mes. */
  const aNominal = (centavosDeHoy: number, mes: Mes): number =>
    Math.round((centavosDeHoy * macro.indice(mes)) / indiceHoy)

  /** Convierte un importe en ARS a la moneda del contrato, a la fecha dada. */
  const aMoneda = (centavosArs: number, moneda: Moneda, fecha: Fecha): number =>
    moneda === 'ARS' ? centavosArs : Math.max(1, Math.round((centavosArs * 100) / macro.mepVenta(fecha)))

  /** Normaliza a ARS para las verificaciones internas (mismo criterio que moneda.ts). */
  const aArs = (centavos: number, moneda: Moneda, fecha: Fecha): number =>
    moneda === 'ARS' ? centavos : Math.round((centavos * macro.mepVenta(fecha)) / 100)

  // -------------------------------------------------------------------------
  // 1. Empresas
  // -------------------------------------------------------------------------

  const razonesUsadas = new Set<string>()
  const dominiosUsados = new Set<string>()
  const cuitsUsados = new Set<string>()
  const perfiles: PerfilEmpresa[] = []

  const estadosPlanificados: EstadoComercial[] = []
  for (const [estado, cantidad] of REPARTO_ESTADOS) {
    for (let i = 0; i < cantidad; i += 1) estadosPlanificados.push(estado)
  }

  function nuevoCuit(): string {
    for (let intento = 0; intento < 500; intento += 1) {
      const cuit = generarCuit()
      if (!cuitsUsados.has(cuit)) {
        cuitsUsados.add(cuit)
        return cuit
      }
    }
    throw new Error('No se pudo generar un CUIT unico')
  }

  for (const estado of estadosPlanificados) {
    const tamanio = elegirPonderado<Tamanio>([
      ['micro', 33],
      ['pyme', 52],
      // Un 15% de corporativas: son las que pueblan el p90 de la cola. Bajarlas
      // aplana la distribucion justo donde el skill quiere que tenga relieve.
      ['corporativa', 15],
    ])
    const [sector, , multiplicadorSector] = elegirPonderado(
      SECTORES.map((fila) => [fila, fila[1]] as const),
    )
    const ubicacion = generarUbicacion()

    // Las cuentas grandes tienen mas chances de pactar en dolares: son las que
    // tienen tesoreria propia y se cubren.
    const moneda: Moneda = chance(tamanio === 'corporativa' ? 0.3 : 0.08) ? 'USD' : 'ARS'

    const empresa: Empresa = {
      id: uuid(),
      razon_social: generarRazonSocial(razonesUsadas),
      cuit: nuevoCuit(),
      sector,
      tamanio,
      estado_comercial: estado,
      moneda_contrato: moneda,
      // Provisorio: a las cuentas con contrato se les recalcula el alta hacia
      // atras a partir de la fecha de inicio del contrato.
      fecha_alta: HOY,
      owner_comercial: elegir(OWNERS),
      ciudad: ubicacion.ciudad,
      provincia: ubicacion.provincia,
    }

    perfiles.push({
      empresa,
      factorMora: 1,
      caracteristicaTelefonica: ubicacion.caracteristica,
      plazoPagoDias: elegirPonderado([
        [30, 55],
        [15, 20],
        [45, 15],
        [60, 10],
      ]),
      origen: elegirPonderado(CANALES),
      multiplicadorAbono: MULTIPLICADOR_TAMANIO[tamanio] * multiplicadorSector,
      contactos: [],
      oportunidades: [],
      ultimaActividad: HOY,
    })
  }

  const porEstado = (estado: EstadoComercial): PerfilEmpresa[] =>
    perfiles.filter((p) => p.empresa.estado_comercial === estado)

  const clientes = porEstado('cliente')
  const exClientes = porEstado('ex_cliente')

  // Cuentas ancla: tres corporativas que van a pesar 24%, 22% y 20% de la
  // facturacion. Es lo que le pasa a un SaaS B2B joven de verdad, y es lo que
  // hace que el HHI, el componente de concentracion del score de riesgo y el
  // top 10 de clientes cuenten todos la misma historia.
  const clientesBarajados = barajar(clientes)
  const anclas = [
    ...clientesBarajados.filter((p) => p.empresa.tamanio === 'corporativa'),
    ...clientesBarajados.filter((p) => p.empresa.tamanio !== 'corporativa'),
  ].slice(0, SHARE_OBJETIVO_ANCLA.length)

  const esAncla = (perfil: PerfilEmpresa): boolean => anclas.includes(perfil)

  // Mora concentrada: 11 empresas problematicas sobre 64 con contrato. Son las
  // que despues aparecen arriba en /cobranzas y abajo en el score de riesgo.
  // Seis de ellas terminaron yendose (churn con historial de mora, no sorteo).
  //
  // Una sola de las anclas entra en el grupo: un cliente enorme que ademas paga
  // mal es el peor escenario de una cartera y tiene que existir. Las otras dos
  // pagan bien; concentracion y mora son riesgos distintos y no van juntos por
  // definicion.
  const primeraAncla = anclas[0]
  const problematicas = [
    ...barajar(exClientes).slice(0, 6),
    ...(primeraAncla === undefined ? [] : [primeraAncla]),
    ...barajar(clientes)
      .filter((perfil) => !esAncla(perfil))
      .slice(0, 4),
  ]
  for (const perfil of perfiles) {
    const sorteo = uniforme()
    if (!problematicas.includes(perfil)) {
      perfil.factorMora = 0.15 + sorteo * 1.0
    } else if (esAncla(perfil)) {
      // El ancla morosa paga mal, pero paga: con el factor de un moroso comun,
      // el 70% de la cartera caida seria de una sola cuenta y /cobranzas
      // dejaria de tener algo que rankear.
      perfil.factorMora = 2.2 + sorteo * 0.5
    } else {
      perfil.factorMora = 2.4 + sorteo * 1.6
    }
  }

  // -------------------------------------------------------------------------
  // 2. Contratos: primero el plan, porque de su fecha de inicio cuelga hacia
  //    atras toda la cadena (oportunidad ganada y alta de la empresa).
  // -------------------------------------------------------------------------

  const mesesDeVentana = mesesEntre(mesInicial, mesCorriente) // 36

  /**
   * Mes de firma. Peso creciente con el tiempo: Nodus vende cada vez mas, y
   * ademas es lo que hace que la serie de MRR a 24 meses tenga pendiente en
   * vez de ser una meseta.
   */
  function sortearMesDeFirma(minimo: number, maximo: number): Mes {
    const opciones: Array<readonly [number, number]> = []
    for (let i = minimo; i <= maximo; i += 1) opciones.push([i, 1 + i / 20])
    return sumarMeses(mesInicial, elegirPonderado(opciones))
  }

  const planes: PlanContrato[] = []
  const clientesConDos = new Set(barajar(clientes).slice(0, 16))
  const clientesConCancelado = new Set(barajar(clientes).slice(0, 2))

  function crearPlan(
    perfil: PerfilEmpresa,
    mesInicioContrato: Mes,
    cancelado: boolean,
  ): PlanContrato {
    const diaInicio = entero(1, 26)
    const fechaInicio: Fecha = sumarDias(primerDia(mesInicioContrato), diaInicio - 1)

    // Abono en pesos de hoy -> se lo lleva a pesos del mes de firma -> se pasa
    // a la moneda del contrato. Log-normal con sigma 0,75: cola larga, que es
    // lo que le da relieve al top 10 de clientes.
    // La escala del ancla se aplica DESPUES del sorteo y del truncado: asi no
    // consume aleatoriedad propia y las dos pasadas comparten el mismo stream.
    const abonoHoyArs = Math.round(
      logNormal({
        mediana: ABONO_MEDIANO_CENTAVOS * perfil.multiplicadorAbono,
        sigma: 0.72,
        minimo: 18_000_000,
        maximo: 880_000_000,
      }) * (escalas.get(perfil.empresa.id) ?? 1),
    )
    const abonoFirmaArs = aNominal(abonoHoyArs, mesInicioContrato)
    const abonoFirma = aMoneda(abonoFirmaArs, perfil.empresa.moneda_contrato, fechaInicio)

    let fechaFin: Fecha | null = null
    let motivo: MotivoBaja | null = null

    if (cancelado) {
      const duracion = entero(7, Math.max(9, mesesEntre(mesInicioContrato, mesCorriente)))
      const mesBaja = sumarMeses(mesInicioContrato, duracion)
      const mesBajaAcotado = mesBaja > sumarMeses(mesCorriente, -1) ? sumarMeses(mesCorriente, -1) : mesBaja
      fechaFin = maxFecha(
        minFecha(sumarDias(primerDia(mesBajaAcotado), entero(5, 25)), sumarDias(HOY, -20)),
        sumarDias(fechaInicio, 45),
      )
      // El motivo de baja correlaciona con el perfil de pago, no se sortea suelto.
      motivo =
        perfil.factorMora >= 2
          ? elegirPonderado<MotivoBaja>([
              ['impago', 60],
              ['reestructuracion', 40],
            ])
          : elegirPonderado<MotivoBaja>([
              ['cambio_de_proveedor', 65],
              ['cierre_de_operacion', 35],
            ])
    }

    const contrato: Contrato = {
      id: uuid(),
      empresa_id: perfil.empresa.id,
      abono_mensual_centavos: abonoFirma, // se recalcula al cerrar la indexacion
      moneda: perfil.empresa.moneda_contrato,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: cancelado ? 'cancelado' : 'activo',
      motivo_baja: motivo,
    }

    const mesUltimoFacturado = fechaFin === null ? mesCorriente : mesDe(fechaFin)

    const plan: PlanContrato = {
      contrato,
      perfil,
      abonoFirmaCentavos: abonoFirma,
      mesInicio: mesInicioContrato,
      mesUltimoFacturado,
      ajustes: [],
    }
    planes.push(plan)
    return plan
  }

  // 54 clientes con contrato activo, 16 de ellos con un segundo contrato -> 70.
  for (const perfil of clientes) {
    // El ancla firma temprano: necesita doce meses completos de facturacion
    // dentro de la ventana, si no su share depende de cuando arranco.
    const ultimoMesDeFirma = esAncla(perfil)
      ? Math.max(2, mesesDeVentana - 15)
      : mesesDeVentana - 1
    const primero = crearPlan(perfil, sortearMesDeFirma(1, ultimoMesDeFirma), false)
    if (clientesConDos.has(perfil)) {
      const desde = Math.min(mesesEntre(mesInicial, primero.mesInicio) + 6, mesesDeVentana - 1)
      crearPlan(perfil, sortearMesDeFirma(desde, mesesDeVentana - 1), false)
    }
    if (clientesConCancelado.has(perfil)) {
      crearPlan(perfil, sortearMesDeFirma(1, Math.max(2, mesesDeVentana - 14)), true)
    }
  }

  // 10 ex clientes, cada uno con su contrato cancelado.
  for (const perfil of exClientes) {
    crearPlan(perfil, sortearMesDeFirma(1, Math.max(2, mesesDeVentana - 12)), true)
  }

  // -------------------------------------------------------------------------
  // 3. Oportunidades
  // -------------------------------------------------------------------------

  const oportunidades: Oportunidad[] = []

  function crearOportunidad(datos: {
    perfil: PerfilEmpresa
    titulo: string
    montoCentavos: number
    moneda: Moneda
    etapa: Etapa
    creacion: Fecha
    cierreEstimado: Fecha
    cierreReal: Fecha | null
    tipo: TipoOportunidad
  }): Oportunidad {
    const oportunidad: Oportunidad = {
      id: uuid(),
      empresa_id: datos.perfil.empresa.id,
      titulo: datos.titulo,
      monto_centavos: Math.max(1, Math.round(datos.montoCentavos)),
      moneda: datos.moneda,
      etapa: datos.etapa,
      probabilidad: PROBABILIDAD[datos.etapa],
      fecha_creacion: datos.creacion,
      fecha_cierre_estimada: datos.cierreEstimado,
      fecha_cierre_real: datos.cierreReal,
      origen: datos.perfil.origen,
      tipo: datos.tipo,
    }
    oportunidades.push(oportunidad)
    datos.perfil.oportunidades.push(oportunidad)
    return oportunidad
  }

  const tituloImplementacion = (perfil: PerfilEmpresa): string =>
    `Implementacion Nodus - ${perfil.empresa.razon_social}`

  // 3.a Una implementacion ganada por contrato, generada hacia atras desde la
  //     firma. De ahi tambien sale la fecha de alta de la empresa.
  const implementacionPorContrato = new Map<string, Oportunidad>()

  for (const plan of planes) {
    const cierreReal = sumarDias(plan.contrato.fecha_inicio, -entero(8, 40))
    const ciclo = entero(25, 165)
    const creacion = sumarDias(cierreReal, -ciclo)
    const cierreEstimado = sumarDias(creacion, Math.max(15, ciclo + entero(-25, 35)))

    // Un proyecto de implementacion vale entre 3 y 8 abonos mensuales.
    const monto = plan.abonoFirmaCentavos * (3 + uniforme() * 4.5)

    const oportunidad = crearOportunidad({
      perfil: plan.perfil,
      titulo: tituloImplementacion(plan.perfil),
      montoCentavos: monto,
      moneda: plan.contrato.moneda,
      etapa: 'ganada',
      creacion,
      cierreEstimado,
      cierreReal,
      tipo: 'implementacion',
    })
    implementacionPorContrato.set(plan.contrato.id, oportunidad)

    // El alta de la cuenta es anterior a su primera oportunidad, siempre.
    const altaCandidata = sumarDias(creacion, -entero(5, 120))
    if (altaCandidata < plan.perfil.empresa.fecha_alta) {
      plan.perfil.empresa.fecha_alta = altaCandidata
    }
  }

  // 3.b Alta de las cuentas sin contrato: cuanto mas avanzada la relacion, mas
  //     vieja la cuenta.
  for (const perfil of perfiles) {
    if (perfil.empresa.fecha_alta !== HOY) continue
    const antiguedadMeses = {
      prospecto: entero(0, 10),
      potencial: entero(2, 18),
      conversaciones_avanzadas: entero(4, 24),
      cliente: 0,
      ex_cliente: 0,
    }[perfil.empresa.estado_comercial]
    // El piso de 45 dias no es decorativo: garantiza que despues haya lugar
    // para meter la creacion de una oportunidad DESPUES del alta y ANTES de hoy.
    perfil.empresa.fecha_alta = sumarDias(HOY, -(antiguedadMeses * 30 + entero(45, 75)))
  }

  // 3.c Expansiones ganadas: suben el abono del contrato desde el mes siguiente.
  //     No generan factura propia (skill seed-financiero, punto 5).
  const planesActivos = planes.filter((plan) => plan.contrato.estado === 'activo')
  const planesParaExpandir = barajar(planesActivos).filter(
    (plan) => mesesEntre(plan.mesInicio, mesCorriente) >= 7,
  )

  for (const plan of planesParaExpandir.slice(0, 20)) {
    // El cierre no puede pasar del mes anterior al corriente: si no, el aumento
    // regiria recien el mes que viene y el abono guardado en contratos no
    // coincidiria con ninguna factura emitida.
    const desde = sumarDias(plan.contrato.fecha_inicio, 150)
    const hasta = sumarDias(primerDia(mesCorriente), -16)
    if (desde >= hasta) continue

    const cierreReal = sumarDias(desde, entero(0, diasEntre(desde, hasta)))
    const ciclo = entero(20, 90)
    const creacion = sumarDias(cierreReal, -ciclo)
    const mesVigencia = sumarMeses(mesDe(cierreReal), 1)

    const abonoVigente = abonoDelMes(plan, sumarMeses(mesVigencia, -1))
    const deltaMensual = Math.round(abonoVigente * (0.12 + uniforme() * 0.25))

    crearOportunidad({
      perfil: plan.perfil,
      // El monto de una expansion es el incremento ANUALIZADO, para que sea
      // comparable con una implementacion dentro del mismo pipeline.
      titulo: `Expansion de licencias - ${plan.perfil.empresa.razon_social}`,
      montoCentavos: deltaMensual * 12,
      moneda: plan.contrato.moneda,
      etapa: 'ganada',
      creacion,
      cierreEstimado: sumarDias(creacion, ciclo + entero(-10, 25)),
      cierreReal,
      tipo: 'expansion',
    })

    plan.ajustes.push({ mes: mesVigencia, deltaCentavos: deltaMensual })
  }

  // 3.d Contracciones: cuatro cuentas que bajaron de plan sin irse. Sin ellas,
  //     el NRR no tendria componente de contraccion y la metrica quedaria coja.
  for (const plan of barajar(planesActivos)
    .filter((p) => mesesEntre(p.mesInicio, mesCorriente) >= 10)
    .slice(0, 4)) {
    const mesBaja = sumarMeses(plan.mesInicio, entero(6, Math.max(7, mesesEntre(plan.mesInicio, mesCorriente) - 2)))
    const abonoVigente = abonoDelMes(plan, sumarMeses(mesBaja, -1))
    plan.ajustes.push({ mes: mesBaja, deltaCentavos: -Math.round(abonoVigente * (0.18 + uniforme() * 0.17)) })
  }

  // 3.e Oportunidades abiertas y perdidas.
  const prospectos = porEstado('prospecto')
  const potenciales = porEstado('potencial')
  const avanzadas = porEstado('conversaciones_avanzadas')

  function fechaCreacionAbierta(perfil: PerfilEmpresa, diasAtrasMax: number): Fecha {
    const desde = perfil.empresa.fecha_alta
    const hasta = sumarDias(HOY, -7)
    const rango = Math.max(1, Math.min(diasAtrasMax, diasEntre(desde, hasta)))
    return sumarDias(hasta, -entero(7, rango))
  }

  // Abiertas de implementacion: las 14 conversaciones avanzadas y 8 potenciales.
  const abiertasImplementacion = [...avanzadas, ...barajar(potenciales).slice(0, 8)]
  for (const perfil of abiertasImplementacion) {
    const creacion = fechaCreacionAbierta(perfil, 210)
    const etapa: Etapa =
      perfil.empresa.estado_comercial === 'conversaciones_avanzadas'
        ? elegirPonderado<Etapa>([
            ['negociacion', 45],
            ['propuesta', 40],
            ['demo', 15],
          ])
        : elegirPonderado<Etapa>([
            ['demo', 40],
            ['calificado', 35],
            ['prospecto', 25],
          ])

    crearOportunidad({
      perfil,
      titulo: tituloImplementacion(perfil),
      montoCentavos: aMoneda(
        aNominal(
          logNormal({
            mediana: ABONO_MEDIANO_CENTAVOS * perfil.multiplicadorAbono * 5,
            sigma: 0.7,
            minimo: 60_000_000,
            maximo: 6_000_000_000,
          }),
          mesCorriente,
        ),
        perfil.empresa.moneda_contrato,
        HOY,
      ),
      moneda: perfil.empresa.moneda_contrato,
      etapa,
      creacion,
      cierreEstimado: sumarDias(HOY, entero(5, 160)),
      cierreReal: null,
      tipo: 'implementacion',
    })
  }

  // Perdidas de implementacion: se quedaron en prospecto o potencial.
  const perdedoras = barajar([...prospectos, ...potenciales]).slice(0, 26)
  for (const perfil of perdedoras) {
    const creacion = fechaCreacionAbierta(perfil, 400)
    const ciclo = entero(20, 140)
    const cierreReal = minFecha(sumarDias(creacion, ciclo), sumarDias(HOY, -1))

    crearOportunidad({
      perfil,
      titulo: tituloImplementacion(perfil),
      montoCentavos: aMoneda(
        aNominal(
          logNormal({
            mediana: ABONO_MEDIANO_CENTAVOS * perfil.multiplicadorAbono * 4.5,
            sigma: 0.7,
            minimo: 50_000_000,
            maximo: 5_000_000_000,
          }),
          mesDe(cierreReal),
        ),
        perfil.empresa.moneda_contrato,
        cierreReal,
      ),
      moneda: perfil.empresa.moneda_contrato,
      etapa: 'perdida',
      creacion,
      cierreEstimado: sumarDias(creacion, ciclo + entero(-15, 30)),
      cierreReal,
      tipo: 'implementacion',
    })
  }

  // Expansiones abiertas y perdidas sobre clientes con contrato activo.
  const planesParaPipeline = barajar(planesActivos)
  for (const [posicion, plan] of planesParaPipeline.slice(0, 30).entries()) {
    const perdida = posicion >= 24
    const creacion = fechaCreacionAbierta(plan.perfil, 150)
    const abonoVigente = abonoDelMes(plan, mesCorriente)
    const deltaMensual = Math.round(abonoVigente * (0.1 + uniforme() * 0.3))
    const cierreReal = perdida ? minFecha(sumarDias(creacion, entero(20, 90)), sumarDias(HOY, -1)) : null

    crearOportunidad({
      perfil: plan.perfil,
      titulo: `Expansion de modulos - ${plan.perfil.empresa.razon_social}`,
      montoCentavos: deltaMensual * 12,
      moneda: plan.contrato.moneda,
      etapa: perdida
        ? 'perdida'
        : elegirPonderado<Etapa>([
            ['propuesta', 30],
            ['negociacion', 25],
            ['demo', 25],
            ['calificado', 20],
          ]),
      creacion,
      cierreEstimado: perdida ? sumarDias(creacion, entero(30, 100)) : sumarDias(HOY, entero(10, 150)),
      cierreReal,
      tipo: 'expansion',
    })
  }

  // -------------------------------------------------------------------------
  // 4. Abono vigente mes a mes
  // -------------------------------------------------------------------------

  /**
   * Abono de un contrato en un mes dado.
   *
   * Los contratos en pesos se ajustan por IPC cada tres meses desde la firma,
   * que es como se pactan de verdad los contratos plurianuales en Argentina.
   * Sin indexacion, un contrato firmado en 2023 estaria facturando hoy la sexta
   * parte de su valor y el MRR real de la cartera se caeria a pedazos por un
   * artificio del seed y no por el negocio.
   *
   * Los contratos en dolares no se indexan: el dolar ya es la cobertura.
   *
   * Sobre esa base se suman las expansiones ganadas y las contracciones, cada
   * una indexada desde el mes en que empezo a regir.
   */
  function abonoDelMes(plan: PlanContrato, mes: Mes): number {
    const indexar = (montoBase: number, mesOrigen: Mes): number => {
      if (plan.contrato.moneda === 'USD') return montoBase
      const transcurridos = mesesEntre(mesOrigen, mes)
      if (transcurridos <= 0) return montoBase
      const mesAncla = sumarMeses(mesOrigen, Math.floor(transcurridos / 3) * 3)
      return Math.round((montoBase * macro.indice(mesAncla)) / macro.indice(mesOrigen))
    }

    let total = indexar(plan.abonoFirmaCentavos, plan.mesInicio)
    for (const ajuste of plan.ajustes) {
      if (mes >= ajuste.mes) total += indexar(ajuste.deltaCentavos, ajuste.mes)
    }
    return Math.max(1, total)
  }

  // El abono que queda guardado en contratos es el VIGENTE HOY. Es lo que hace
  // que el MRR calculado desde contratos coincida con el de las facturas del
  // mes corriente.
  for (const plan of planes) {
    plan.contrato.abono_mensual_centavos = abonoDelMes(plan, plan.mesUltimoFacturado)
  }

  // -------------------------------------------------------------------------
  // 5. Facturas
  // -------------------------------------------------------------------------

  type FacturaEnCurso = Factura & { perfil: PerfilEmpresa }
  const facturasEnCurso: FacturaEnCurso[] = []

  function emitir(datos: {
    perfil: PerfilEmpresa
    contratoId: string | null
    oportunidadId: string | null
    emision: Fecha
    montoCentavos: number
    moneda: Moneda
  }): void {
    if (datos.emision > HOY) return // ningun hecho consumado despues de hoy
    const vencimiento = sumarDias(datos.emision, datos.perfil.plazoPagoDias)
    facturasEnCurso.push({
      id: uuid(),
      empresa_id: datos.perfil.empresa.id,
      contrato_id: datos.contratoId,
      oportunidad_id: datos.oportunidadId,
      numero: '', // se asigna al final, por orden de emision
      fecha_emision: datos.emision,
      fecha_vencimiento: vencimiento,
      monto_centavos: Math.max(1, Math.round(datos.montoCentavos)),
      moneda: datos.moneda,
      estado: 'pendiente',
      perfil: datos.perfil,
    })
  }

  // 5.a Abono mensual: una factura por mes de vigencia.
  for (const plan of planes) {
    const meses = mesesEntre(plan.mesInicio, plan.mesUltimoFacturado)
    for (let i = 0; i <= meses; i += 1) {
      const mes = sumarMeses(plan.mesInicio, i)
      const emision = i === 0 ? plan.contrato.fecha_inicio : primerDia(mes)
      emitir({
        perfil: plan.perfil,
        contratoId: plan.contrato.id,
        oportunidadId: null,
        emision,
        montoCentavos: abonoDelMes(plan, mes),
        moneda: plan.contrato.moneda,
      })
    }
  }

  // 5.b Hitos de implementacion: 30% / 40% / 30%. El resto de la division
  //     entera va al ultimo hito, para que los tres sumen el monto exacto.
  const PORCENTAJES_HITO = [0.3, 0.4, 0.3] as const
  for (const plan of planes) {
    const oportunidad = exigir(
      implementacionPorContrato.get(plan.contrato.id),
      'Contrato sin oportunidad de implementacion',
    )
    const cierre = exigir(oportunidad.fecha_cierre_real, 'Oportunidad ganada sin fecha de cierre')

    const montos = [
      Math.round(oportunidad.monto_centavos * PORCENTAJES_HITO[0]),
      Math.round(oportunidad.monto_centavos * PORCENTAJES_HITO[1]),
      0,
    ]
    montos[2] = oportunidad.monto_centavos - (montos[0] ?? 0) - (montos[1] ?? 0)

    const desfasajes = [entero(1, 10), entero(35, 60), entero(80, 130)]
    for (let hito = 0; hito < 3; hito += 1) {
      emitir({
        perfil: plan.perfil,
        contratoId: null,
        oportunidadId: oportunidad.id,
        emision: sumarDias(cierre, exigir(desfasajes[hito], 'desfasaje')),
        montoCentavos: exigir(montos[hito], 'monto de hito'),
        moneda: oportunidad.moneda,
      })
    }
  }

  // Numeracion correlativa por fecha de emision, como la de un talonario real.
  facturasEnCurso.sort(
    (a, b) => a.fecha_emision.localeCompare(b.fecha_emision) || a.id.localeCompare(b.id),
  )
  facturasEnCurso.forEach((factura, posicion) => {
    factura.numero = `FA-0001-${String(posicion + 1).padStart(8, '0')}`
  })

  // -------------------------------------------------------------------------
  // 6. Cobros
  // -------------------------------------------------------------------------

  const cobros: Cobro[] = []

  function nuevoCobro(factura: Factura, fecha: Fecha, montoCentavos: number): void {
    cobros.push({
      id: uuid(),
      factura_id: factura.id,
      fecha,
      monto_centavos: montoCentavos,
      moneda: factura.moneda,
      medio: elegirPonderado<MedioCobro>([
        ['transferencia', 62],
        ['echeq', 18],
        ['cheque', 11],
        ['debito', 9],
      ]),
    })
  }

  /**
   * Probabilidad de pago ANTICIPADO, es decir antes del vencimiento.
   *
   * Es una propiedad del cliente, igual que la mora: el que paga bien a veces
   * paga antes, por descuento financiero o simplemente porque tiene la plata.
   *
   * Sin esto la mora queda modelada como un piso -- nadie paga antes de la
   * fecha -- y el DSO de la cartera se dispara aunque casi todo se cobre dentro
   * del mes. Es el error que encontro el agente analista-financiero: 0 cobros
   * anticipados sobre 1167 (skill seed-financiero, seccion 6).
   */
  const probabilidadDeAnticipo = (factorMora: number): number =>
    Math.max(0.02, 0.23 - 0.15 * factorMora)

  for (const factura of facturasEnCurso) {
    const { perfil } = factura

    // --- Pago anticipado. La ventana va del dia siguiente a la emision al dia
    //     anterior al vencimiento, y nunca pasa de hoy.
    const limiteAnticipo = minFecha(sumarDias(factura.fecha_vencimiento, -1), HOY)
    const margenAnticipo = diasEntre(factura.fecha_emision, limiteAnticipo)
    if (margenAnticipo >= 1 && chance(probabilidadDeAnticipo(perfil.factorMora))) {
      const fecha = sumarDias(limiteAnticipo, -entero(0, Math.min(margenAnticipo - 1, 12)))
      nuevoCobro(factura, fecha, factura.monto_centavos)
      factura.estado = 'pagada'
      continue
    }

    // --- Todavia no vencio y no se anticipo: queda pendiente.
    if (factura.fecha_vencimiento >= HOY) {
      factura.estado = 'pendiente'
      continue
    }

    const diasVencida = diasEntre(factura.fecha_vencimiento, HOY)

    // --- Incobrable. Es una decision propia sobre facturas viejas de clientes
    //     con historial malo, no el residuo de "no se cobro". Cuando salia como
    //     residuo, el stock viejo se acumulaba y dejaba el 44,6% del saldo
    //     estancado en +90, con un ECL del 34,7%.
    //     A una cuenta grande no se le da de baja la deuda: se renegocia, se
    //     reclama o se le corta el servicio, pero no se provisiona a perdida.
    //     Si se las deja caer, sus facturas -- las de un ancla son 50 veces la
    //     mediana -- se llevan solas el 40% del saldo de la cartera, y el ECL
    //     de la cartera deja de ser creible.
    if (
      diasVencida > 120 &&
      perfil.factorMora >= 2.2 &&
      perfil.empresa.tamanio !== 'corporativa' &&
      chance(0.42)
    ) {
      factura.estado = 'incobrable'
      // A veces entro algo antes de darla por perdida.
      if (chance(0.25)) {
        const parcial = Math.round(factura.monto_centavos * (0.15 + uniforme() * 0.25))
        nuevoCobro(factura, sumarDias(factura.fecha_vencimiento, entero(5, 60)), parcial)
      }
      continue
    }

    // --- Sigue abierta?
    //     Ventana de gestion de cobranza: una factura con menos de tres meses
    //     de vencida todavia se esta reclamando, y que siga abierta es normal.
    //     Pasado ese punto la probabilidad de seguir abierta DECAE rapido: una
    //     factura de hace ocho meses o se cobro tarde o se dio por perdida, no
    //     se queda colgada para siempre inflando el aging, el DSO y el ECL.
    const enCicloNormal = diasVencida <= 95
    const decaimiento = Math.exp(-Math.max(0, diasVencida - 95) / 40)
    //     Y depende del tamano: una corporativa tiene tesoreria y paga en fecha
    //     aunque se atrase unos dias; la mora se acumula en las cuentas chicas.
    //     Sin esto, las facturas de las anclas -- 50 veces la mediana -- quedan
    //     abiertas y se llevan solas el DSO de la cartera.
    const factorTamanio = { micro: 1.3, pyme: 1.0, corporativa: 0.42 }[perfil.empresa.tamanio]
    let pSinCobrar = (0.02 + 0.7 * Math.max(0, perfil.factorMora - 0.8)) * decaimiento * factorTamanio
    if (enCicloNormal) pSinCobrar += 0.66 * factorTamanio
    pSinCobrar = Math.min(0.93, pSinCobrar)

    if (chance(pSinCobrar)) {
      if (!enCicloNormal && chance(0.22)) {
        const parcial = Math.round(factura.monto_centavos * (0.25 + uniforme() * 0.35))
        const fecha = minFecha(sumarDias(factura.fecha_vencimiento, entero(3, 45)), sumarDias(HOY, -1))
        nuevoCobro(factura, fecha, parcial)
        factura.estado = 'parcial'
        continue
      }

      factura.estado = 'vencida'
      continue
    }

    // --- Cobrada, con atraso proporcional al factorMora. Si la factura estuvo
    //     mucho tiempo abierta y termino entrando, entro tarde: no puede
    //     figurar cobrada a los tres dias del vencimiento.
    const atrasoBase = Math.max(0, Math.round((Math.abs(normal()) * 6 + 1) * perfil.factorMora))
    const atraso = enCicloNormal ? atrasoBase : Math.min(diasVencida, atrasoBase + entero(20, 90))
    const primerPago = sumarDias(factura.fecha_vencimiento, atraso)

    if (primerPago > HOY) {
      // Se le paso la fecha y todavia no entro: queda vencida, no cobrada.
      factura.estado = 'vencida'
      continue
    }

    // Un 12% se cobra en dos veces. El resto se paga de una.
    if (chance(0.12)) {
      const primeraParte = Math.round(factura.monto_centavos * (0.4 + uniforme() * 0.3))
      nuevoCobro(factura, primerPago, primeraParte)
      const segundoPago = sumarDias(primerPago, entero(5, 45))
      if (segundoPago > HOY) {
        factura.estado = 'parcial'
      } else {
        nuevoCobro(factura, segundoPago, factura.monto_centavos - primeraParte)
        factura.estado = 'pagada'
      }
      continue
    }

    nuevoCobro(factura, primerPago, factura.monto_centavos)
    factura.estado = 'pagada'
  }

  // -------------------------------------------------------------------------
  // 7. Contactos
  // -------------------------------------------------------------------------

  const contactos: Contacto[] = []
  for (const perfil of perfiles) {
    const dominio = dominioDe(perfil.empresa.razon_social, dominiosUsados)
    const cantidad = {
      prospecto: 1,
      potencial: entero(1, 2),
      conversaciones_avanzadas: entero(2, 3),
      cliente: entero(2, 4),
      ex_cliente: entero(1, 2),
    }[perfil.empresa.estado_comercial]

    for (let i = 0; i < cantidad; i += 1) {
      const nombre = faker.person.firstName()
      const apellido = faker.person.lastName()
      const [cargo, , cargoDecisor] = elegirPonderado(CARGOS.map((fila) => [fila, fila[1]] as const))
      const usuario = `${nombre}.${apellido}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z.]/g, '')

      const contacto: Contacto = {
        id: uuid(),
        empresa_id: perfil.empresa.id,
        nombre,
        apellido,
        cargo,
        email: `${usuario}${i > 0 ? i + 1 : ''}@${dominio}`,
        // La caracteristica es la de la ciudad de la empresa, no una al azar.
        telefono: generarTelefono(perfil.caracteristicaTelefonica),
        // Solo una parte decide la compra, y correlaciona con el cargo.
        es_decisor: cargoDecisor && chance(0.55),
      }
      contactos.push(contacto)
      perfil.contactos.push(contacto)
    }

    // Toda cuenta con contrato tiene al menos un decisor identificado.
    const primero = perfil.contactos[0]
    if (
      primero !== undefined &&
      !perfil.contactos.some((c) => c.es_decisor) &&
      (perfil.empresa.estado_comercial === 'cliente' || perfil.empresa.estado_comercial === 'ex_cliente')
    ) {
      primero.es_decisor = true
    }
  }

  // -------------------------------------------------------------------------
  // 8. Campanias
  // -------------------------------------------------------------------------

  const campanias: Campania[] = []
  const NOMBRE_CAMPANIA: Readonly<Record<Canal, string>> = {
    email: 'Newsletter logistica',
    eventos: 'Expo Logistica',
    linkedin: 'Prospeccion LinkedIn',
    google_ads: 'Search - software de flota',
    contenido: 'Informe de costos logisticos',
    referidos: 'Programa de referidos',
    telemarketing: 'Telemarketing pymes',
    partners: 'Alianza con integradores',
  }

  for (let i = 0; i < 24; i += 1) {
    const canal = elegirPonderado(CANALES)
    const mesInicioCampania = sumarMeses(mesInicial, entero(0, mesesDeVentana - 1))
    const duracionMeses = entero(1, 3)
    const inicio = sumarDias(primerDia(mesInicioCampania), entero(0, 10))
    const fin = minFecha(sumarDias(inicio, duracionMeses * 30), HOY)

    campanias.push({
      id: uuid(),
      nombre: `${NOMBRE_CAMPANIA[canal]} ${mesInicioCampania}`,
      canal,
      presupuesto_centavos: aNominal(
        logNormal({ mediana: 900_000_000, sigma: 0.6, minimo: 120_000_000, maximo: 9_000_000_000 }),
        mesInicioCampania,
      ),
      moneda: 'ARS',
      fecha_inicio: inicio,
      fecha_fin: fin,
    })
  }

  // -------------------------------------------------------------------------
  // 9. Acciones comerciales
  // -------------------------------------------------------------------------

  const acciones: Accion[] = []

  // Hasta cuando se le hacen acciones a cada cuenta: a un ex cliente se le deja
  // de hacer seguimiento poco despues de la baja.
  for (const perfil of perfiles) {
    const cancelados = planes.filter(
      (plan) => plan.perfil === perfil && plan.contrato.fecha_fin !== null,
    )
    const activos = planes.filter((plan) => plan.perfil === perfil && plan.contrato.fecha_fin === null)
    if (perfil.empresa.estado_comercial === 'ex_cliente' && activos.length === 0) {
      const ultimaBaja = cancelados
        .map((plan) => plan.contrato.fecha_fin ?? HOY)
        .sort((a, b) => a.localeCompare(b))
        .at(-1)
      perfil.ultimaActividad = minFecha(sumarDias(ultimaBaja ?? HOY, entero(10, 60)), HOY)
    }
  }

  const NOTAS: Readonly<Record<TipoAccion, string>> = {
    email: 'Envio de material y propuesta de agenda.',
    llamada: 'Llamado de seguimiento con el area de operaciones.',
    videollamada: 'Reunion remota para relevar el circuito de despacho.',
    demo: 'Demo del modulo de ruteo y control de flota.',
    visita: 'Visita al deposito para relevar la operacion.',
    evento: 'Contacto en stand durante el evento del sector.',
  }

  for (const perfil of perfiles) {
    const base = {
      prospecto: 4,
      potencial: 6,
      conversaciones_avanzadas: 10,
      cliente: 8,
      ex_cliente: 8,
    }[perfil.empresa.estado_comercial]

    const cantidad = Math.max(1, base + entero(-2, 3))

    for (let i = 0; i < cantidad; i += 1) {
      // Fecha con estacionalidad: se sortea y se acepta segun el factor del mes
      // (enero 0,4; segunda quincena de julio 0,6; marzo/abril/sept/oct 1,2).
      const desde = perfil.empresa.fecha_alta
      const hasta = perfil.ultimaActividad
      const rango = Math.max(1, diasEntre(desde, hasta))
      let fecha = sumarDias(desde, entero(0, rango))
      for (let intento = 0; intento < 8; intento += 1) {
        if (uniforme() < factorEstacional(fecha) / 1.2) break
        fecha = sumarDias(desde, entero(0, rango))
      }

      const tipo = elegirPonderado<TipoAccion>([
        ['email', 30],
        ['llamada', 24],
        ['videollamada', 16],
        ['demo', 13],
        ['visita', 11],
        ['evento', 6],
      ])

      // Se cuelga de la oportunidad que estaba abierta ese dia, si habia alguna.
      const oportunidadDelMomento = perfil.oportunidades.find(
        (o) => o.fecha_creacion <= fecha && (o.fecha_cierre_real ?? HOY) >= fecha,
      )

      // Atribucion a campania: solo si la campania estaba corriendo ese dia. Se
      // prioriza la del canal de origen de la cuenta, que es lo que hace que el
      // CAC por canal signifique algo.
      const vigentes = campanias.filter((c) => c.fecha_inicio <= fecha && c.fecha_fin >= fecha)
      const delCanal = vigentes.filter((c) => c.canal === perfil.origen)
      const campania =
        delCanal.length > 0 && chance(0.75)
          ? elegir(delCanal)
          : vigentes.length > 0 && chance(0.35)
            ? elegir(vigentes)
            : null

      const positiva =
        perfil.empresa.estado_comercial === 'cliente' ||
        perfil.empresa.estado_comercial === 'conversaciones_avanzadas'

      acciones.push({
        id: uuid(),
        empresa_id: perfil.empresa.id,
        contacto_id: chance(0.75) && perfil.contactos.length > 0 ? elegir(perfil.contactos).id : null,
        oportunidad_id: oportunidadDelMomento?.id ?? null,
        campania_id: campania?.id ?? null,
        tipo,
        fecha,
        costo_centavos: aNominal(
          Math.round(COSTO_ACCION[tipo] * (0.6 + uniforme() * 0.9)),
          mesDe(fecha),
        ),
        moneda: 'ARS',
        resultado: elegirPonderado<ResultadoAccion>(
          positiva
            ? [
                ['positivo', 45],
                ['neutro', 30],
                ['sin_respuesta', 15],
                ['negativo', 10],
              ]
            : [
                ['positivo', 20],
                ['neutro', 30],
                ['sin_respuesta', 34],
                ['negativo', 16],
              ],
        ),
        notas: NOTAS[tipo],
      })
    }
  }

  acciones.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))

  // -------------------------------------------------------------------------
  // 10. Diagnostico para el informe y para qa-datos
  // -------------------------------------------------------------------------

  const desde12m = sumarDias(HOY, -365)
  const facturacion12m = new Map<string, number>()
  for (const factura of facturasEnCurso) {
    if (factura.fecha_emision < desde12m) continue
    const enArs = aArs(factura.monto_centavos, factura.moneda, factura.fecha_emision)
    facturacion12m.set(factura.empresa_id, (facturacion12m.get(factura.empresa_id) ?? 0) + enArs)
  }

  const mrrContratos = planes
    .filter((plan) => plan.contrato.estado === 'activo')
    .reduce(
      (total, plan) => total + aArs(plan.contrato.abono_mensual_centavos, plan.contrato.moneda, HOY),
      0,
    )

  const mrrFacturas = facturasEnCurso
    .filter((factura) => factura.contrato_id !== null && mesDe(factura.fecha_emision) === mesCorriente)
    .filter((factura) => {
      const plan = planes.find((p) => p.contrato.id === factura.contrato_id)
      return plan?.contrato.estado === 'activo'
    })
    .reduce((total, factura) => total + aArs(factura.monto_centavos, factura.moneda, HOY), 0)

  const facturadoTotal = [...facturacion12m.values()].reduce((total, valor) => total + valor, 0)
  const idsAncla = new Set(anclas.map((perfil) => perfil.empresa.id))
  const facturacionNoAncla = [...facturacion12m.entries()]
    .filter(([empresaId]) => !idsAncla.has(empresaId))
    .map(([, valor]) => valor)
  const anclasDiagnostico: Ancla[] = anclas.map((perfil) => {
    const facturado = facturacion12m.get(perfil.empresa.id) ?? 0
    return {
      empresaId: perfil.empresa.id,
      razonSocial: perfil.empresa.razon_social,
      esProblematica: problematicas.includes(perfil),
      facturacion12mCentavos: facturado,
      share: facturadoTotal === 0 ? 0 : facturado / facturadoTotal,
    }
  })

  const facturas: Factura[] = facturasEnCurso.map(({ perfil: _perfil, ...factura }) => factura)

  return {
    empresas: perfiles.map((perfil) => perfil.empresa),
    contactos,
    campanias,
    oportunidades,
    contratos: planes.map((plan) => plan.contrato),
    facturas,
    cobros,
    acciones,
    ipc: macro.ipc,
    tipoCambio: macro.tipoCambio,
    diagnostico: {
      hoy: HOY,
      mesInicial,
      mesCorriente,
      empresasProblematicas: problematicas.length,
      mepVentaHoyCentavos: mepHoy,
      facturacion12mPorEmpresa: [...facturacion12m.values()],
      facturacion12mNoAncla: facturacionNoAncla,
      facturacion12mTotalCentavos: facturadoTotal,
      anclas: anclasDiagnostico,
      mrrDesdeContratosCentavos: mrrContratos,
      mrrDesdeFacturasCentavos: mrrFacturas,
    },
  }
}
