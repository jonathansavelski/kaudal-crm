/**
 * Mapeo de las filas de pantalla a hojas de Excel.
 *
 * Vive en la capa de agregados y no en el componente por dos razones: el encabezado de
 * cada columna tiene que decir si el importe es nominal, real o USD MEP (rule
 * `dinero.md` §3), y la conversion de centavos a pesos pasa una sola vez, en `aPesos`.
 */

import type { FilaAccionVista, FilaCampaniaVista } from '@/lib/agregados/acciones'
import type { FilaCobranza } from '@/lib/agregados/cobranzas'
import type { FilaCuenta } from '@/lib/agregados/cuentas'
import {
  ETIQUETA_BUCKET,
  ETIQUETA_ESTADO_COMERCIAL,
  ETIQUETA_ESTADO_FACTURA,
  ETIQUETA_RESULTADO_ACCION,
  ETIQUETA_SECTOR,
  ETIQUETA_TAMANIO,
  ETIQUETA_TIPO_ACCION,
} from '@/lib/etiquetas'
import type { HojaExcel } from '@/lib/exportar-excel'
import { aFechaExcel, aPesos } from '@/lib/exportar-excel'

export function hojaDeCuentas(cuentas: readonly FilaCuenta[], mesBase: string): HojaExcel {
  return {
    nombre: 'Cuentas',
    filas: cuentas.map((cuenta) => ({
      'Razón social': cuenta.razonSocial,
      CUIT: cuenta.cuit,
      'Estado comercial': ETIQUETA_ESTADO_COMERCIAL[cuenta.estadoComercial],
      Sector: ETIQUETA_SECTOR[cuenta.sector],
      Tamaño: ETIQUETA_TAMANIO[cuenta.tamanio],
      Provincia: cuenta.provincia,
      Ciudad: cuenta.ciudad,
      'Owner comercial': cuenta.owner,
      'Fecha de alta': aFechaExcel(cuenta.fechaAlta),
      'Facturación 12m ARS nominal': aPesos(cuenta.facturacion12mCentavos),
      [`Facturación 12m ARS real (pesos de ${mesBase})`]: aPesos(cuenta.facturacion12mRealCentavos),
      'Saldo pendiente ARS nominal': aPesos(cuenta.saldoCentavos),
      'Abono mensual ARS nominal': aPesos(cuenta.abonoMensualCentavos),
      'Facturas emitidas': cuenta.cantidadFacturas,
      'Mora promedio (días)': Math.round(cuenta.moraPromedioDias),
      'Score de riesgo (0-100)': cuenta.score,
      'Oportunidades abiertas': cuenta.oportunidadesAbiertas,
      'Pipeline abierto ARS nominal': aPesos(cuenta.pipelineCentavos),
    })),
  }
}

export function hojaDeCobranzas(filas: readonly FilaCobranza[], mesBase: string): HojaExcel {
  return {
    nombre: 'Facturas',
    filas: filas.map((fila) => ({
      Factura: fila.numero,
      Cuenta: fila.razonSocial,
      Emisión: aFechaExcel(fila.fechaEmision),
      Vencimiento: aFechaExcel(fila.fechaVencimiento),
      Estado: ETIQUETA_ESTADO_FACTURA[fila.estadoVigente],
      Antigüedad: ETIQUETA_BUCKET[fila.bucket],
      'Días de mora': fila.diasMora,
      Moneda: fila.moneda,
      'Monto en su moneda': aPesos(fila.montoOriginalCentavos),
      'Monto ARS nominal': aPesos(fila.montoArsCentavos),
      'Saldo ARS nominal': aPesos(fila.saldoArsCentavos),
      [`Saldo ARS real (pesos de ${mesBase})`]: aPesos(fila.saldoRealCentavos),
    })),
  }
}

export function hojaDeAcciones(filas: readonly FilaAccionVista[]): HojaExcel {
  return {
    nombre: 'Acciones',
    filas: filas.map((fila) => ({
      Fecha: aFechaExcel(fila.fecha),
      Tipo: ETIQUETA_TIPO_ACCION[fila.tipo],
      Resultado: ETIQUETA_RESULTADO_ACCION[fila.resultado],
      Cuenta: fila.razonSocial,
      'Owner comercial': fila.owner,
      Campaña: fila.campania,
      Oportunidad: fila.oportunidad,
      'Costo ARS nominal': aPesos(fila.costoArsCentavos),
      Notas: fila.notas ?? '',
    })),
  }
}

export function hojaDeCampanias(filas: readonly FilaCampaniaVista[]): HojaExcel {
  return {
    nombre: 'Campañas',
    filas: filas.map((fila) => ({
      Campaña: fila.nombre,
      Canal: fila.etiquetaCanal,
      Inicio: aFechaExcel(fila.fechaInicio),
      Fin: aFechaExcel(fila.fechaFin),
      'Presupuesto ARS nominal': aPesos(fila.presupuestoArsCentavos),
      'Costo de acciones ARS nominal': aPesos(fila.costoAccionesArsCentavos),
      'Acciones generadas': fila.acciones,
      'Oportunidades atribuidas': fila.oportunidadesAtribuidas,
      'Oportunidades ganadas': fila.oportunidadesGanadas,
      'Retorno ARS nominal': aPesos(fila.retornoArsCentavos),
      'ROI (veces)': fila.roi,
    })),
  }
}
