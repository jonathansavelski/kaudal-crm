/**
 * Datos argentinos del seed: geografia coherente, CUIT con digito verificador
 * calculado, formas societarias reales y cargos de decision B2B.
 *
 * Esto no sale de faker a proposito. faker 10 no trae locale es_AR, y aunque
 * lo trajera, "Rosario, Neuquen" es exactamente el tipo de dato que delata
 * datos fake apenas alguien mira de cerca (skill seed-financiero, punto 11).
 */

import { elegir, elegirPonderado, entero } from './aleatorio.ts'

// ---------------------------------------------------------------------------
// Geografia: la ciudad, la provincia y la caracteristica telefonica van juntas
// ---------------------------------------------------------------------------

type Ciudad = { ciudad: string; caracteristica: string }
type Provincia = { provincia: string; peso: number; ciudades: readonly Ciudad[] }

const PROVINCIAS: readonly Provincia[] = [
  {
    provincia: 'Ciudad Autonoma de Buenos Aires',
    peso: 20,
    ciudades: [{ ciudad: 'Ciudad Autonoma de Buenos Aires', caracteristica: '11' }],
  },
  {
    provincia: 'Buenos Aires',
    peso: 26,
    ciudades: [
      { ciudad: 'La Plata', caracteristica: '221' },
      { ciudad: 'Mar del Plata', caracteristica: '223' },
      { ciudad: 'Bahia Blanca', caracteristica: '291' },
      { ciudad: 'San Isidro', caracteristica: '11' },
      { ciudad: 'Quilmes', caracteristica: '11' },
      { ciudad: 'Tigre', caracteristica: '11' },
      { ciudad: 'Pilar', caracteristica: '2304' },
      { ciudad: 'Campana', caracteristica: '3489' },
      { ciudad: 'Lomas de Zamora', caracteristica: '11' },
      { ciudad: 'Tandil', caracteristica: '249' },
    ],
  },
  {
    provincia: 'Santa Fe',
    peso: 12,
    ciudades: [
      { ciudad: 'Rosario', caracteristica: '341' },
      { ciudad: 'Santa Fe', caracteristica: '342' },
      { ciudad: 'Rafaela', caracteristica: '3492' },
      { ciudad: 'Venado Tuerto', caracteristica: '3462' },
    ],
  },
  {
    provincia: 'Cordoba',
    peso: 11,
    ciudades: [
      { ciudad: 'Cordoba', caracteristica: '351' },
      { ciudad: 'Rio Cuarto', caracteristica: '358' },
      { ciudad: 'Villa Maria', caracteristica: '353' },
    ],
  },
  {
    provincia: 'Mendoza',
    peso: 6,
    ciudades: [
      { ciudad: 'Mendoza', caracteristica: '261' },
      { ciudad: 'San Rafael', caracteristica: '260' },
    ],
  },
  {
    provincia: 'Entre Rios',
    peso: 4,
    ciudades: [
      { ciudad: 'Parana', caracteristica: '343' },
      { ciudad: 'Concordia', caracteristica: '345' },
      { ciudad: 'Gualeguaychu', caracteristica: '3446' },
    ],
  },
  {
    provincia: 'Tucuman',
    peso: 3,
    ciudades: [{ ciudad: 'San Miguel de Tucuman', caracteristica: '381' }],
  },
  {
    provincia: 'Salta',
    peso: 3,
    ciudades: [{ ciudad: 'Salta', caracteristica: '387' }],
  },
  {
    provincia: 'Neuquen',
    peso: 3,
    ciudades: [
      { ciudad: 'Neuquen', caracteristica: '299' },
      { ciudad: 'Plottier', caracteristica: '299' },
    ],
  },
  {
    provincia: 'Rio Negro',
    peso: 2,
    ciudades: [
      { ciudad: 'General Roca', caracteristica: '298' },
      { ciudad: 'San Carlos de Bariloche', caracteristica: '294' },
    ],
  },
  {
    provincia: 'Chubut',
    peso: 2,
    ciudades: [
      { ciudad: 'Comodoro Rivadavia', caracteristica: '297' },
      { ciudad: 'Trelew', caracteristica: '280' },
    ],
  },
  {
    provincia: 'Corrientes',
    peso: 2,
    ciudades: [{ ciudad: 'Corrientes', caracteristica: '379' }],
  },
  {
    provincia: 'Chaco',
    peso: 2,
    ciudades: [{ ciudad: 'Resistencia', caracteristica: '362' }],
  },
  {
    provincia: 'Misiones',
    peso: 2,
    ciudades: [{ ciudad: 'Posadas', caracteristica: '376' }],
  },
  {
    provincia: 'San Juan',
    peso: 1,
    ciudades: [{ ciudad: 'San Juan', caracteristica: '264' }],
  },
  {
    provincia: 'La Pampa',
    peso: 1,
    ciudades: [{ ciudad: 'Santa Rosa', caracteristica: '2954' }],
  },
]

export type Ubicacion = {
  provincia: string
  ciudad: string
  caracteristica: string
  telefono: string
}

/**
 * Numero fijo con la caracteristica de la ciudad. Los diez digitos totales
 * (caracteristica + abonado) son los que tiene un numero argentino de verdad.
 */
export function generarTelefono(caracteristica: string): string {
  const digitosAbonado = 10 - caracteristica.length
  let abonado = ''
  for (let i = 0; i < digitosAbonado; i += 1) abonado += String(entero(0, 9))
  const corte = Math.ceil(abonado.length / 2)
  return `+54 ${caracteristica} ${abonado.slice(0, corte)}-${abonado.slice(corte)}`
}

export function generarUbicacion(): Ubicacion {
  const provincia = elegirPonderado(PROVINCIAS.map((p) => [p, p.peso] as const))
  const ciudad = elegir(provincia.ciudades)

  return {
    provincia: provincia.provincia,
    ciudad: ciudad.ciudad,
    caracteristica: ciudad.caracteristica,
    telefono: generarTelefono(ciudad.caracteristica),
  }
}

// ---------------------------------------------------------------------------
// CUIT
// ---------------------------------------------------------------------------

const MULTIPLICADORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

function digitoVerificador(diezDigitos: string): number {
  if (!/^[0-9]{10}$/.test(diezDigitos)) throw new Error(`Base de CUIT invalida: ${diezDigitos}`)

  const suma = MULTIPLICADORES.reduce(
    (acumulado, multiplicador, posicion) => acumulado + Number(diezDigitos.charAt(posicion)) * multiplicador,
    0,
  )

  const resto = suma % 11
  if (resto === 0) return 0
  if (resto === 1) return 9 // convencion de AFIP para personas juridicas
  return 11 - resto
}

/**
 * CUIT de persona juridica (prefijos 30, 33 y 34) con digito verificador
 * calculado de verdad. Alguien lo va a validar con una calculadora online.
 */
export function generarCuit(): string {
  const prefijo = elegir(['30', '33', '34'])
  let cuerpo = ''
  for (let i = 0; i < 8; i += 1) cuerpo += String(entero(0, 9))
  const base = `${prefijo}${cuerpo}`
  return `${base}${digitoVerificador(base)}`
}

/** Se exporta para que qa-datos pueda re-verificar los 120 CUIT generados. */
export function cuitEsValido(cuit: string): boolean {
  if (!/^[0-9]{11}$/.test(cuit)) return false
  return Number(cuit[10]) === digitoVerificador(cuit.slice(0, 10))
}

// ---------------------------------------------------------------------------
// Razones sociales
// ---------------------------------------------------------------------------

const RUBROS = [
  'Transportes',
  'Logistica',
  'Distribuidora',
  'Cargas',
  'Fletes',
  'Grupo',
  'Establecimiento',
  'Industrias',
  'Alimentos',
  'Agro',
  'Comercial',
  'Servicios',
  'Depositos',
  'Frigorifico',
  'Molinos',
  'Metalurgica',
  'Envases',
  'Insumos',
] as const

const NOMBRES = [
  'del Sur',
  'del Norte',
  'del Litoral',
  'Andina',
  'Pampeana',
  'Patagonica',
  'Cuyana',
  'Rioplatense',
  'Central',
  'San Martin',
  'Belgrano',
  'Parana',
  'Uspallata',
  'Los Alamos',
  'La Victoria',
  'Santa Ana',
  'El Retiro',
  'Nueva Era',
  'Aconcagua',
  'Iguazu',
  'Salado',
  'Colon',
  'Mitre',
  'Alvear',
  'Quebracho',
  'Ceibo',
  'Talar',
  'Rosales',
  'Guemes',
  'Pilcomayo',
] as const

/** Formas societarias reales, con el peso que tienen en el padron argentino. */
const FORMAS: ReadonlyArray<readonly [string, number]> = [
  ['S.A.', 40],
  ['S.R.L.', 45],
  ['S.A.S.', 15],
]

export function generarRazonSocial(usadas: Set<string>): string {
  for (let intento = 0; intento < 200; intento += 1) {
    const razon = `${elegir(RUBROS)} ${elegir(NOMBRES)} ${elegirPonderado(FORMAS)}`
    if (!usadas.has(razon)) {
      usadas.add(razon)
      return razon
    }
  }
  throw new Error('No se pudo generar una razon social unica')
}

/** Dominio de mail derivado de la razon social, sin acentos ni espacios. */
export function dominioDe(razonSocial: string, usados: Set<string>): string {
  const base = razonSocial
    .toLowerCase()
    .replace(/s\.a\.s\.|s\.r\.l\.|s\.a\./g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18)

  let dominio = `${base}.com.ar`
  let sufijo = 2
  while (usados.has(dominio)) {
    dominio = `${base}${sufijo}.com.ar`
    sufijo += 1
  }
  usados.add(dominio)
  return dominio
}

// ---------------------------------------------------------------------------
// Gente
// ---------------------------------------------------------------------------

/** Cargos con peso de decision de compra en un SaaS de logistica. */
export const CARGOS: ReadonlyArray<readonly [string, number, boolean]> = [
  ['Gerente de Logistica', 18, true],
  ['Director de Operaciones', 10, true],
  ['Jefe de Compras', 12, true],
  ['CFO', 6, true],
  ['Gerente General', 6, true],
  ['Gerente de Administracion', 10, true],
  ['Jefe de Deposito', 12, false],
  ['Analista de Logistica', 12, false],
  ['Coordinador de Flota', 8, false],
  ['Analista de Sistemas', 6, false],
]

/** Los seis vendedores de Nodus. Filtro de /pipeline y de /cuentas. */
export const OWNERS = [
  'Sofia Aguirre',
  'Martin Casteran',
  'Lucia Bengochea',
  'Diego Pereyra',
  'Valentina Roldan',
  'Nicolas Ferrari',
] as const
