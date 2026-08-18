/**
 * Lectura de scripts/datos-macro.json: IPC mensual y cotizaciones reales,
 * congeladas por scripts/bajar-macro.ts.
 *
 * El seed lee de aca y NUNCA de la red. Determinismo y capacidad de correr
 * offline: si el MEP de hoy cambiara entre dos corridas, cambiarian todos los
 * importes normalizados a ARS y el informe dejaria de ser verificable.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import type { Fecha, Mes } from './fechas.ts'
import { mesDe } from './fechas.ts'

export type FilaIpc = { periodo: string; indice: number; variacion_mensual: number }
export type FilaTipoCambio = {
  fecha: string
  casa: string
  compra_centavos: number
  venta_centavos: number
}

type ArchivoMacro = {
  generado_en: string
  ventana: { desde: string; hasta: string }
  ipc: FilaIpc[]
  tipo_cambio: FilaTipoCambio[]
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function exigir<T>(valor: T | undefined, mensaje: string): T {
  if (valor === undefined) throw new Error(mensaje)
  return valor
}

function validarArchivo(crudo: unknown): ArchivoMacro {
  if (!esObjeto(crudo)) throw new Error('datos-macro.json no es un objeto')
  const ipc = crudo['ipc']
  const tipoCambio = crudo['tipo_cambio']
  const ventana = crudo['ventana']

  if (!Array.isArray(ipc) || ipc.length === 0) throw new Error('datos-macro.json sin serie de IPC')
  if (!Array.isArray(tipoCambio) || tipoCambio.length === 0) {
    throw new Error('datos-macro.json sin cotizaciones')
  }
  if (!esObjeto(ventana)) throw new Error('datos-macro.json sin ventana')

  return {
    generado_en: String(crudo['generado_en'] ?? ''),
    ventana: { desde: String(ventana['desde'] ?? ''), hasta: String(ventana['hasta'] ?? '') },
    ipc: ipc as FilaIpc[],
    tipo_cambio: tipoCambio as FilaTipoCambio[],
  }
}

export type Macro = {
  ipc: readonly FilaIpc[]
  tipoCambio: readonly FilaTipoCambio[]
  /** Meses de la serie, en orden. El primero es el mes cero de toda la historia del seed. */
  meses: readonly Mes[]
  primerMes: Mes
  /** Ultimo mes con IPC publicado. Los meses posteriores usan este indice. */
  ultimoMesConIpc: Mes
  /** Indice de precios del mes. Si el mes es posterior al ultimo publicado, devuelve el ultimo. */
  indice: (mes: Mes) => number
  /**
   * MEP venta en centavos de una fecha. Los dias sin cotizacion (fines de
   * semana, feriados, paros bancarios) se resuelven con la ultima cotizacion
   * disponible hacia atras, que es lo que haria una tesoreria de verdad al
   * valuar una operacion de un sabado.
   */
  mepVenta: (fecha: Fecha) => number
}

export function cargarMacro(): Macro {
  const ruta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos-macro.json')
  const archivo = validarArchivo(JSON.parse(readFileSync(ruta, 'utf8')) as unknown)

  const indicePorMes = new Map<Mes, number>()
  for (const fila of archivo.ipc) indicePorMes.set(mesDe(fila.periodo), fila.indice)

  const meses = archivo.ipc.map((fila) => mesDe(fila.periodo))
  const primerMes: Mes = exigir(meses[0], 'Serie de IPC vacia')
  const ultimoMesConIpc: Mes = exigir(meses[meses.length - 1], 'Serie de IPC vacia')

  const indicePrimero: number = exigir(indicePorMes.get(primerMes), 'Serie de IPC inconsistente')
  const indiceUltimo: number = exigir(indicePorMes.get(ultimoMesConIpc), 'Serie de IPC inconsistente')

  function indice(mes: Mes): number {
    if (mes > ultimoMesConIpc) return indiceUltimo
    if (mes < primerMes) return indicePrimero
    const valor = indicePorMes.get(mes)
    if (valor === undefined) throw new Error(`No hay IPC para el mes ${mes}`)
    return valor
  }

  // Serie MEP ordenada, para resolver el "hacia atras" con busqueda binaria.
  const mep = archivo.tipo_cambio
    .filter((fila) => fila.casa === 'mep')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (mep.length === 0) throw new Error('datos-macro.json no tiene cotizaciones MEP')

  const primeraMep: FilaTipoCambio = exigir(mep[0], 'Serie MEP vacia')

  function mepVenta(fecha: Fecha): number {
    if (fecha <= primeraMep.fecha) return primeraMep.venta_centavos

    let bajo = 0
    let alto = mep.length - 1
    let encontrado = primeraMep.venta_centavos

    while (bajo <= alto) {
      const medio = (bajo + alto) >> 1
      const fila = mep[medio]
      if (fila === undefined) break
      if (fila.fecha <= fecha) {
        encontrado = fila.venta_centavos
        bajo = medio + 1
      } else {
        alto = medio - 1
      }
    }

    return encontrado
  }

  return {
    ipc: archivo.ipc,
    tipoCambio: archivo.tipo_cambio,
    meses,
    primerMes,
    ultimoMesConIpc,
    indice,
    mepVenta,
  }
}
