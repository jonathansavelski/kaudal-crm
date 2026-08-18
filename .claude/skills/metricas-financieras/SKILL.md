---
name: metricas-financieras
description: Diccionario canónico de las fórmulas financieras de Kaudal CRM. Fuente de verdad única — ninguna pantalla puede calcular una métrica de forma distinta a la que dice acá. Usar al implementar o auditar cualquier cálculo de pipeline, cobranzas, suscripciones, riesgo o conversión de moneda.
---

# Skill: métricas financieras

**Este archivo es la fuente de verdad.** Si una pantalla necesita una métrica calculada
distinto, se corrige este skill primero y después el código. No se bifurca el cálculo.

El agente `analista-financiero` audita fórmula por fórmula contra este documento.

## Convenciones que aplican a todo el skill

- Los importes entran y salen en **centavos enteros** (rule `dinero.md`).
- Toda métrica que mezcle monedas **normaliza a ARS primero**, con la cotización MEP de
  una fecha explícita. Nunca se suman ARS y USD directo.
- Las funciones son **puras**: no hacen fetch, no leen Supabase, no llaman `Date.now()`.
  Si necesitan "hoy", lo reciben como parámetro `hoy: Date`.
- Cuando una métrica **no se puede calcular** (denominador cero, cartera vacía), la
  función devuelve `null`. Nunca `NaN`, nunca `Infinity`, nunca `0` haciéndose pasar por
  un resultado válido.
- Los ratios se devuelven como **fracción decimal** (`0.05`), no como porcentaje (`5`).
  La conversión a porcentaje es cosa del formateador.
- No se redondea en la capa de cálculo, salvo donde este documento lo diga explícitamente.

## Mapa de módulos

| Archivo | Métricas |
|---|---|
| `src/lib/metricas/moneda.ts` | Normalización ARS/USD, deflactado por IPC, USD MEP |
| `src/lib/metricas/pipeline.ts` | Pipeline ponderado, probabilidades, ciclo de venta, forecast |
| `src/lib/metricas/cobranzas.ts` | DSO, aging, VAN de cartera, pérdida por inflación |
| `src/lib/metricas/suscripciones.ts` | MRR, NRR, churn, ARPA, CAC, LTV |
| `src/lib/metricas/riesgo.ts` | HHI, ECL, score de riesgo, exposición cambiaria |

---

# moneda.ts

## Normalización a ARS

Todo importe en USD se lleva a ARS con la cotización **MEP, valor venta**, de la fecha
que corresponda al hecho económico (emisión de la factura, cierre de la oportunidad).

```
ars_centavos = usd_centavos × mep_venta_centavos / 100
```

El `/ 100` sale de que la cotización también viene en centavos. Redondeo al entero más
cercano, una sola vez, al final.

```ts
export function normalizarAArs(
  importe: Importe,
  mepVentaCentavos: number,
): number
```

Si `importe.moneda === 'ARS'` devuelve `importe.centavos` sin tocar.

**Caso de prueba:** USD 1.000 (100.000 centavos) a MEP venta $1.500 (150.000 centavos)
→ 100.000 × 150.000 / 100 = **150.000.000 centavos** = $1.500.000.

## Deflactado por IPC (valor real)

Llevar un importe nominal de un mes a pesos de un mes base:

```
real = nominal × ipc_base / ipc_origen
```

`ipc_origen` es el índice del mes del hecho (emisión, cobro); `ipc_base` es el del mes al
que se quiere expresar. Cuando `ipc_base` es el mes más viejo, el resultado es menor que
el nominal: eso es lo que se quiere mostrar.

```ts
export function deflactar(
  nominalCentavos: number,
  ipcOrigen: number,
  ipcBase: number,
): number
```

Devuelve `null` si `ipcOrigen` es 0 o negativo.

**Caso de prueba:** $1.000.000 nominal de un mes con IPC 125, expresado en pesos del mes
con IPC 100 → 1.000.000 × 100 / 125 = **$800.000 reales**.

## A USD MEP

```
usd_centavos = ars_centavos × 100 / mep_venta_centavos
```

**Caso de prueba:** $1.500.000 (150.000.000 centavos) a MEP venta $1.500
→ 150.000.000 × 100 / 150.000 = **100.000 centavos** = USD 1.000.

---

# pipeline.ts

## Probabilidades por etapa

Tabla fija. Es la única fuente; ninguna pantalla la redefine.

| Etapa | Probabilidad |
|---|---|
| `prospecto` | 0,05 |
| `calificado` | 0,15 |
| `demo` | 0,30 |
| `propuesta` | 0,50 |
| `negociacion` | 0,75 |
| `ganada` | 1,00 |
| `perdida` | 0,00 |

```ts
export const PROBABILIDAD_POR_ETAPA: Readonly<Record<Etapa, number>>
```

La columna `probabilidad` de la tabla `oportunidades` se **deriva de la etapa**, no se
carga a mano. Si una fila viniera con un valor distinto, manda la etapa.

## Pipeline ponderado

```
pipeline_ponderado = Σ (monto_normalizado_ars_i × probabilidad(etapa_i))
```

Sobre oportunidades **abiertas**: se excluyen `ganada` y `perdida`. Incluirlas
distorsiona, porque el pipeline mide lo que falta cerrar, no lo cerrado.

```ts
export function calcularPipelinePonderado(
  oportunidades: readonly OportunidadNormalizada[],
): number
```

**Caso de prueba calculado a mano:**

| Oportunidad | Monto ARS | Etapa | Prob. | Aporte |
|---|---:|---|---:|---:|
| A | 1.000.000 | demo | 0,30 | 300.000 |
| B | 2.000.000 | propuesta | 0,50 | 1.000.000 |
| C | 1.500.000 | negociacion | 0,75 | 1.125.000 |
| D | 5.000.000 | ganada | — | excluida |

Total = 300.000 + 1.000.000 + 1.125.000 = **$2.425.000** = `242_500_000` centavos.

## Ciclo de venta

```
ciclo_dias = promedio(fecha_cierre_real − fecha_creacion)   sobre oportunidades ganadas
```

Solo `ganada` y solo con `fecha_cierre_real` no nula. Diferencia en días calendario
completos. Devuelve `null` si no hay ninguna oportunidad ganada.

```ts
export function calcularCicloDeVenta(
  oportunidades: readonly Oportunidad[],
): number | null
```

**Caso de prueba:** una ganada del 10/01/2026 al 11/03/2026 (60 días) y otra del
01/02/2026 al 02/05/2026 (90 días) → promedio **75 días**.

## Forecast

```
forecast(n_meses) = Σ (monto_ars_i × probabilidad(etapa_i))
                    para oportunidades abiertas con fecha_cierre_estimada
                    dentro de los próximos n meses
```

Mismo criterio que el pipeline ponderado, filtrando por ventana temporal. Se expone a
3 y a 6 meses.

---

# cobranzas.ts

## Saldo de una factura

```
saldo_i = monto_i − Σ cobros_aplicados_i
```

Lo calcula la vista `v_saldo_facturas` en Postgres. La capa TS lo consume, no lo
recalcula, salvo en escenarios simulados.

## Aging

Buckets por **días desde el vencimiento**, sobre facturas con saldo mayor a cero:

| Bucket | Condición |
|---|---|
| `corriente` | `fecha_vencimiento >= hoy` (no vencida) |
| `1-30` | 1 a 30 días de mora |
| `31-60` | 31 a 60 |
| `61-90` | 61 a 90 |
| `+90` | más de 90 |
| `incobrable` | `estado = 'incobrable'`, sin importar los días |

`incobrable` es un bucket aparte y **excluyente**: una factura marcada incobrable no
aparece además en `+90`. Si no, se contaría dos veces en el ECL.

```ts
export function calcularAging(
  facturas: readonly FacturaConSaldo[],
  hoy: Date,
): Record<BucketAging, { saldoCentavos: number; cantidad: number }>
```

## DSO

```
DSO = (saldo_promedio_cuentas_por_cobrar / ventas_a_credito_del_periodo) × dias_del_periodo
```

- `saldo_promedio` = promedio del saldo de CxC entre el inicio y el fin del período.
- `ventas_a_credito` = monto facturado en el período (toda la facturación de Nodus es a
  crédito: se emite y se cobra después).
- Devuelve `null` si `ventas_a_credito` es cero.

```ts
export function calcularDso(
  saldoPromedioCentavos: number,
  ventasACreditoCentavos: number,
  diasDelPeriodo: number,
): number | null
```

**Caso de prueba:** saldo promedio $9.000.000, ventas del período $30.000.000, 90 días
→ (9.000.000 / 30.000.000) × 90 = 0,30 × 90 = **27 días**.

## VAN de la cartera

```
TEA = (1 + TNA/12)^12 − 1

VAN = Σ  saldo_i / (1 + TEA)^(dias_hasta_cobro_esperado_i / 365)
```

- La TNA sale del API de plazo fijo. La UI deja pisarla a mano.
- `dias_hasta_cobro_esperado`: para una factura no vencida, días hasta el vencimiento.
  Para una vencida, se asume que se cobra en el plazo promedio histórico de mora de esa
  empresa; si no hay historial, 30 días.
- Las facturas `incobrable` no entran al VAN: su valor esperado lo maneja el ECL.

```ts
export function calcularVanCartera(
  facturas: readonly FacturaConSaldo[],
  tnaAnual: number,
  hoy: Date,
): number
```

**Caso de prueba:** una sola factura de $1.000.000 a cobrar en 90 días, TNA 40%.

1. TEA = (1 + 0,40/12)^12 − 1 = (1,033333)^12 − 1 ≈ **0,482126**
2. Factor = (1,482126)^(90/365) ≈ **1,101888**
3. VAN = 1.000.000 / 1,101888 ≈ **$907.534**

Por ser irracional, este test usa tolerancia (`toBeCloseTo`), no igualdad exacta.

## Pérdida por inflación

```
valor_real   = nominal × ipc_emision / ipc_cobro
perdida      = nominal − valor_real
```

Para facturas **abiertas** (todavía no cobradas) se usa el IPC del último mes disponible
en lugar de `ipc_cobro`.

```ts
export function calcularPerdidaPorInflacion(
  nominalCentavos: number,
  ipcEmision: number,
  ipcCobro: number,
): number | null
```

**Caso de prueba:** factura de $1.000.000 emitida con IPC 100 y cobrada con IPC 125
→ valor real = 1.000.000 × 100/125 = $800.000 → pérdida = **$200.000**.

Ojo con la dirección: acá el nominal se lleva a pesos del **mes de emisión** (se pregunta
cuánto valía realmente lo que entró), que es el inverso de `deflactar()`, donde el mes
base se elige libre. Son dos usos distintos del mismo cociente de índices.

---

# suscripciones.ts

## MRR

```
MRR = Σ abono_mensual_normalizado_ars   sobre contratos con estado = 'activo'
```

Los contratos `pausado` y `cancelado` no suman. Las facturas de implementación **no**
entran al MRR: son one-shot, no recurrentes.

```ts
export function calcularMrr(
  contratos: readonly ContratoNormalizado[],
): number
```

**Caso de prueba:** activos de $500.000 + $300.000 + USD 200 (a MEP 1.500 = $300.000),
más un cancelado de $400.000 → **$1.100.000** = `110_000_000` centavos.

## NRR (net revenue retention)

```
NRR = (MRR_inicial + expansion − contraccion − churn) / MRR_inicial
```

Sobre la cohorte de clientes que **ya existían al inicio del período**. Los clientes
nuevos no entran (esa es la diferencia con el crecimiento bruto).

- `expansion`: aumentos de abono de clientes existentes.
- `contraccion`: bajas de abono sin cancelación.
- `churn`: abono perdido por cancelación completa.

Devuelve `null` si `MRR_inicial` es cero.

**Caso de prueba:** inicial $1.000.000, expansión $200.000, contracción $50.000,
churn $100.000 → (1.000.000 + 200.000 − 50.000 − 100.000) / 1.000.000 = 1.050.000 /
1.000.000 = **1,05** (105%).

## Churn mensual

```
churn_mensual = clientes_perdidos_en_el_mes / clientes_activos_al_inicio_del_mes
```

"Perdido" = contrato que pasó a `cancelado` en ese mes. Devuelve `null` si no había
clientes activos al inicio.

**Caso de prueba:** 3 perdidos sobre 60 activos al inicio → **0,05** (5%).

## ARPA

```
ARPA = MRR / clientes_activos
```

Devuelve `null` si no hay clientes activos.

**Caso de prueba:** MRR $1.100.000 sobre 55 clientes activos → **$20.000**
= `2_000_000` centavos.

## CAC por canal

```
CAC_canal = costo_total_acciones_del_canal_en_el_periodo / clientes_nuevos_atribuidos_al_canal
```

- `costo_total`: suma de `acciones_comerciales.costo_centavos` de las acciones de ese
  canal dentro del período, normalizado a ARS.
- `clientes_nuevos_atribuidos`: empresas que pasaron a `cliente` en el período y cuya
  oportunidad ganada tiene ese canal como `origen`.
- Devuelve `null` si el canal no trajo clientes nuevos — un CAC infinito no es cero, y
  mostrarlo como cero sería exactamente al revés de la verdad.

**Caso de prueba:** canal eventos, costo $3.000.000, 6 clientes nuevos
→ **$500.000** por cliente = `50_000_000` centavos.

## LTV

```
LTV = (ARPA × margen_bruto) / churn_mensual
```

`margen_bruto` por defecto **0,75**, parametrizable desde la UI. Devuelve `null` si el
churn es cero (LTV infinito no es un número que se pueda mostrar).

```ts
export function calcularLtv(
  arpaCentavos: number,
  churnMensual: number,
  margenBruto = 0.75,
): number | null
```

**Caso de prueba:** ARPA $20.000, margen 0,75, churn 0,05
→ (20.000 × 0,75) / 0,05 = 15.000 / 0,05 = **$300.000** = `30_000_000` centavos.

El ratio LTV/CAC del ejemplo da 300.000 / 500.000 = 0,6 — por debajo de 1, o sea que ese
canal destruye valor. Es el tipo de lectura que la pantalla tiene que dejar ver.

---

# riesgo.ts

## HHI de concentración

```
share_i = facturacion_12m_cliente_i / facturacion_12m_total
HHI     = Σ (share_i × 100)²
```

Sobre la facturación de los **últimos 12 meses**, normalizada a ARS. El máximo teórico es
10.000 (un solo cliente).

| HHI | Lectura |
|---|---|
| < 1500 | Diversificada |
| 1500 – 2500 | Moderada |
| > 2500 | Concentrada |

```ts
export function calcularHhi(
  facturacionPorCliente: readonly number[],
): number | null
```

Devuelve `null` si la facturación total es cero.

**Caso de prueba:** cuatro clientes con 40%, 30%, 20% y 10%
→ 40² + 30² + 20² + 10² = 1.600 + 900 + 400 + 100 = **3.000** → concentrada.

## ECL (pérdida crediticia esperada)

```
ECL = Σ (exposicion_i × PD_bucket_i)
```

Probabilidad de default por bucket de aging:

| Bucket | PD |
|---|---:|
| `corriente` | 0,01 |
| `1-30` | 0,02 |
| `31-60` | 0,08 |
| `61-90` | 0,20 |
| `+90` | 0,45 |
| `incobrable` | 1,00 |

`exposicion_i` es el **saldo pendiente**, no el monto original de la factura.

```ts
export const PD_POR_BUCKET: Readonly<Record<BucketAging, number>>

export function calcularEcl(
  aging: Record<BucketAging, { saldoCentavos: number; cantidad: number }>,
): number
```

**Caso de prueba calculado a mano:**

| Bucket | Saldo | PD | Aporte |
|---|---:|---:|---:|
| corriente | 10.000.000 | 0,01 | 100.000 |
| 1-30 | 5.000.000 | 0,02 | 100.000 |
| 31-60 | 2.000.000 | 0,08 | 160.000 |
| 61-90 | 1.000.000 | 0,20 | 200.000 |
| +90 | 1.000.000 | 0,45 | 450.000 |
| incobrable | 500.000 | 1,00 | 500.000 |

ECL = **$1.510.000** = `151_000_000` centavos.

## Exposición cambiaria

```
exposicion_ars = saldo_cartera_denominado_en_ars / saldo_cartera_total_normalizado_ars
```

Sensibilidad: ante un salto del MEP de `X` (fracción, `0.25` = +25%), el valor **en USD**
de la porción denominada en ARS cae:

```
caida = 1 − 1 / (1 + X)
```

```ts
export function calcularExposicionCambiaria(
  saldoArsCentavos: number,
  saldoUsdNormalizadoCentavos: number,
): number | null

export function calcularCaidaPorSaltoMep(saltoMep: number): number
```

**Caso de prueba:** cartera de $8.000.000 en ARS y USD equivalente a $2.000.000
→ exposición = 8.000.000 / 10.000.000 = **0,80** (80%).
Ante un salto del MEP de +25%: caída = 1 − 1/1,25 = 1 − 0,80 = **0,20** (20%).

## Score de riesgo del cliente

Escala **0 a 100, donde 100 es el mejor cliente**. Cuatro componentes ponderados:

| Componente | Peso | Cómo se normaliza a 0-100 |
|---|---:|---|
| Días de mora promedio | 40% | `max(0, 100 − (mora / 90) × 100)` — 0 días = 100, 90 o más = 0 |
| % de facturas pagadas fuera de término | 30% | `100 × (1 − pct_fuera_de_termino)` |
| Antigüedad como cliente | 15% | `min(100, (meses_de_antiguedad / 36) × 100)` — 36 meses o más = 100 |
| Peso en la facturación total (penaliza) | 15% | `100 × (1 − min(1, share / 0,15))` — 15% o más de la facturación = 0 |

```
score = 0,40·A + 0,30·B + 0,15·C + 0,15·D
```

Se redondea al entero al final, una sola vez.

> **Nota de implementación.** La consigna fija los cuatro pesos pero no las escalas de
> normalización. Los tres cortes — 90 días de mora, 36 meses de antigüedad, 15% de
> concentración — son decisión de este skill, y están acá justamente para que todas las
> pantallas usen los mismos. Si se cambian, se cambian acá y se recalcula todo.

El componente de concentración **penaliza**: un cliente que representa mucho de la
facturación es un riesgo, por más que pague puntual. Es la contracara del HHI a nivel
cartera.

```ts
export function calcularScoreDeRiesgo(entrada: {
  moraPromedioDias: number
  pctFacturasFueraDeTermino: number
  mesesDeAntiguedad: number
  shareFacturacion: number
}): number
```

**Caso de prueba calculado a mano:** mora promedio 18 días, 25% de facturas fuera de
término, 30 meses de antigüedad, 5% de la facturación total.

| Componente | Valor | Peso | Aporte |
|---|---:|---:|---:|
| A: `100 − (18/90)×100` | 80,00 | 0,40 | 32,0 |
| B: `100 × (1 − 0,25)` | 75,00 | 0,30 | 22,5 |
| C: `(30/36) × 100` | 83,33 | 0,15 | 12,5 |
| D: `100 × (1 − 0,05/0,15)` | 66,67 | 0,15 | 10,0 |

Score = **77**.

---

## Checklist de auditoría

Lo que el agente `analista-financiero` verifica en cada pasada:

- [ ] Cada fórmula implementada coincide literalmente con la de este documento.
- [ ] Ningún cálculo financiero vive fuera de `src/lib/metricas/`.
- [ ] Cada función exportada tiene test con al menos un caso calculado a mano.
- [ ] Los casos de prueba de este skill están todos cubiertos, con el número exacto.
- [ ] Toda división tiene su guarda de denominador cero devolviendo `null`.
- [ ] Ninguna función mezcla ARS y USD sin normalizar antes.
- [ ] Ninguna función redondea un resultado intermedio.
- [ ] Los números tienen sentido económico: MRR positivo, churn entre 0 y 1, HHI entre 0
      y 10.000, score entre 0 y 100, NRR razonable (0,5 a 1,5 salvo caso extremo).
