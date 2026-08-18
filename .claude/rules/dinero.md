# Rule: dinero

Cómo se guarda, se opera y se muestra la plata en Kaudal. No es negociable: un error acá
no rompe el build, produce un número creíble y equivocado, que es peor.

## 1. Nunca `float`

La plata se guarda y se opera **siempre como entero de centavos**.

- Postgres: `bigint`. Prohibido `numeric`, `real`, `double precision`, `money` para importes.
- TypeScript: `number` que representa centavos. El sufijo `_centavos` en el nombre es
  obligatorio y no se abrevia.

```ts
// mal
const monto = 1234.56
type Factura = { monto: number }

// bien
const montoCentavos = 123_456
type Factura = { monto_centavos: number }
```

Excepción única: `numeric` para índices y tasas (`ipc_mensual.indice`,
`ipc_mensual.variacion_mensual`, TNA/TEA). No son plata, son coeficientes.

**Por qué:** `0.1 + 0.2 !== 0.3`. Sobre 1400 facturas, el error de punto flotante se
acumula y el total del dashboard deja de coincidir con la suma del detalle — que es
exactamente lo que audita el agente `qa-datos`.

## 2. Todo monto viaja con su moneda

Ninguna columna de importe existe sin una columna de moneda al lado.

```sql
monto_centavos  bigint      not null,
moneda          moneda_enum not null  -- 'ARS' | 'USD'
```

En TS, el par va junto en un tipo, nunca suelto:

```ts
export type Importe = { centavos: number; moneda: Moneda }
```

Una función que recibe `number` y no sabe la moneda está mal tipada. Si necesita comparar
o sumar importes de distinta moneda, normaliza primero con `src/lib/metricas/moneda.ts`,
que pide explícitamente la fecha y la cotización a usar.

**Por qué:** sumar ARS con USD sin darse cuenta es el bug más caro y más silencioso de
todo el sistema.

## 3. Ninguna cifra ambigua en pantalla

Todo valor mostrado se etiqueta de forma explícita como uno de tres:

| Etiqueta | Qué significa |
|---|---|
| **nominal** | Pesos corrientes, tal cual figuran en la factura |
| **real** | Deflactado por IPC a pesos de un mes base declarado |
| **USD MEP** | Convertido a dólar MEP a la cotización de una fecha declarada |

La etiqueta va visible: en el eje, en la leyenda, en el tooltip, en el encabezado de
columna o al lado del KPI. **El color no cuenta como etiqueta** — un daltónico tiene que
poder distinguir nominal de real.

Cuando se muestra real, además hay que decir *a pesos de qué mes*. "Real" a secas no
significa nada.

```
mal:  Cartera: $ 48.200.000
bien: Cartera: $ 48.200.000 nominal · $ 31.400.000 real (pesos de ago-2026)
```

## 4. Redondeo solo al presentar

La capa de cálculo (`src/lib/metricas/`) opera en centavos enteros y devuelve centavos
enteros o ratios sin redondear. El redondeo ocurre **una sola vez**, en el formateador.

- Prohibido `Math.round` dentro de `src/lib/metricas/` sobre un resultado intermedio.
- Cuando una división produce centavos fraccionarios (prorrateos, promedios), se redondea
  al final con `Math.round`, y si el reparto tiene que sumar exacto, el residuo se asigna
  al último elemento. Nunca se pierde ni se inventa un centavo.

**Por qué:** redondear en cada paso intermedio y después sumar da un total distinto que
sumar y redondear una vez. El dashboard tiene que cuadrar con el detalle al centavo.

## 5. Formateo centralizado

Todo formateo pasa por `src/lib/formato.ts`. Nadie llama a `Intl.NumberFormat` ni a
`toLocaleString` fuera de ese archivo.

- Locale `es-AR` siempre: separador de miles `.`, decimal `,`.
- Moneda con `Intl.NumberFormat('es-AR', { style: 'currency', currency })`.
- Los importes se muestran **sin decimales** salvo que el valor sea menor a $100.
- Abreviado en ejes de gráficos: `$ 1,2 M`, `$ 850 k`. Nunca abreviado en tablas ni en
  fichas de detalle, donde se necesita la cifra exacta.
- Fechas con `date-fns` y locale `es`. Formato corto `dd/MM/yyyy`.
- Los números en tablas usan `font-variant-numeric: tabular-nums` (clase `.tabular`) para
  que las columnas alineen.

## 6. Negativos y cero

- Un importe negativo se muestra con signo menos y en color `--negativo`, nunca entre
  paréntesis ni solo en rojo.
- Cero es un valor legítimo y se muestra como `$ 0`. **Nunca** se muestra como `—`, vacío
  o `N/D`: eso está reservado para *dato ausente*, que es otra cosa.
- Ninguna pantalla muestra `NaN`, `Infinity`, `undefined` ni `null`. Si un cálculo no se
  puede hacer (por ejemplo LTV con churn cero), la función devuelve `null` y la UI
  muestra un texto que explica por qué, no un guión mudo.
