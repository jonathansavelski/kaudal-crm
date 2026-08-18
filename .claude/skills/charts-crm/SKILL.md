---
name: charts-crm
description: Convenciones de Recharts para Kaudal CRM — paleta por tipo de serie, ejes en pesos abreviados, tooltips con moneda y etiqueta nominal/real/USD MEP, alturas, responsive y estado sin datos. Usar al construir o revisar cualquier gráfico.
---

# Skill: charts-crm

Todos los gráficos de Kaudal se ven como si los hubiera hecho la misma mano. Este skill
fija las convenciones; la rule `ui.md` fija los mínimos innegociables (tooltip, leyenda,
estado vacío).

Los gráficos se van a **proyectar**. Eso manda sobre todo lo demás: trazos gruesos,
tipografía grande, contraste alto, poca serie por gráfico.

## 1. Paleta

Los colores viven como CSS custom properties en `src/index.css` y se consumen con
`var(--...)`. **Ningún hex hardcodeado en un componente de gráfico.**

### Series genéricas (categorías sin semántica propia)

`--chart-1` a `--chart-8`, en ese orden. Ocho es el techo: si un gráfico necesita más,
el problema es el gráfico — se agrupa en "otros".

### Series con semántica financiera

Esta es la que más importa. El tipo de valor **siempre** usa el mismo color en toda la app:

| Token | Uso | Lectura |
|---|---|---|
| `--nominal` | Serie en pesos corrientes | Azul |
| `--real` | Serie deflactada por IPC | Verde |
| `--usd` | Serie en dólar MEP | Verde azulado |

Cuando conviven nominal y real en el mismo gráfico (el caso del dashboard), **nominal va
en línea sólida y real en línea punteada**. El color no alcanza: la rule `ui.md` pide que
la información no dependa solo del color.

```tsx
<Line dataKey="nominal" stroke="var(--nominal)" strokeWidth={2.5} />
<Line dataKey="real" stroke="var(--real)" strokeWidth={2.5} strokeDasharray="5 4" />
```

### Buckets de aging

Escala secuencial: cuanto más vencido, más caliente. Siempre en este orden, siempre estos
colores, en el gráfico y en la tabla.

| Bucket | Token |
|---|---|
| corriente | `--aging-corriente` |
| 1-30 | `--aging-1-30` |
| 31-60 | `--aging-31-60` |
| 61-90 | `--aging-61-90` |
| +90 | `--aging-90-mas` |
| incobrable | `--aging-incobrable` |

### Signo

`--positivo` y `--negativo` para variaciones. `--neutro` para "sin cambio" y para series
de referencia (escenario base en el simulador).

## 2. Ejes

- **Eje Y de importes: siempre abreviado.** `$ 1,2 M`, `$ 850 k`, `$ 0`. Nunca el número
  completo, que rompe el layout y no se lee de lejos. El formateador es
  `formatearImporteAbreviado` de `src/lib/formato.ts`.
- **Eje X de tiempo:** `MMM yy` en español (`ene 26`), con `date-fns` locale `es`. En
  series de 24 meses se muestra un tick cada 3 meses para que no se amontone.
- Sin unidades repetidas en cada tick si ya están en el título del eje.
- `axisLine={false}` y `tickLine={false}`: el grid ya da la referencia y el gráfico
  respira mejor.
- Grid solo horizontal (`<CartesianGrid vertical={false} />`), con
  `stroke="var(--border)"`.
- Los porcentajes se muestran con un decimal como mucho (`12,4%`).

## 3. Tooltips

Es lo más importante del skill, porque es donde se lee el número exacto.

Todo tooltip es **custom**, nunca el default de Recharts, y muestra:

1. El período o categoría como encabezado, formateado en `es-AR`.
2. Una línea por serie, con su marcador de color, el nombre y el valor formateado con
   símbolo de moneda.
3. **La etiqueta del tipo de valor** — `nominal`, `real (pesos de ago-2026)` o `USD MEP`.
   Es obligatorio por la rule `dinero.md`: ninguna cifra ambigua.
4. Cuando corresponde, el dato de contexto: cantidad de oportunidades detrás del monto,
   cantidad de facturas del bucket.

```
ago 2026
  Facturación nominal        $ 12.480.350
  Facturación real           $  8.115.220   pesos de ago-2026
  38 facturas
```

Los importes en el tooltip van **completos, sin abreviar**: el eje abrevia, el tooltip
precisa. Esa es la división de tareas entre los dos.

`cursor={{ fill: 'var(--accent)', opacity: 0.4 }}` en barras;
`cursor={{ stroke: 'var(--border)' }}` en líneas.

## 4. Leyenda

- Obligatoria con dos o más series (rule `ui.md`).
- Arriba a la derecha o abajo centrada, nunca tapando datos.
- El texto de la leyenda **incluye el tipo de valor**: "Facturación nominal", no
  "Facturación".
- En gráficos de una sola serie se omite y el nombre va en el título de la card.

## 5. Dimensiones y responsive

- **Altura mínima 260 px.** Los gráficos del dashboard van a 300 px; el gráfico grande de
  evolución, a 360 px.
- Siempre dentro de `<ResponsiveContainer width="100%" height={...}>`. **Nunca un ancho
  fijo en px.**
- Márgenes: `{ top: 8, right: 12, bottom: 8, left: 8 }` de base. Se agranda `left` solo
  si las etiquetas del eje Y lo piden.
- En barras horizontales, el ancho del eje Y se fija (`width={140}`) y las etiquetas
  largas se truncan con ellipsis, con el nombre completo en el tooltip.
- Grosor de trazo `2.5` en líneas; `radius={[4, 4, 0, 0]}` en barras verticales.
- En tablet, las grillas de gráficos pasan a una columna y la altura sube un escalón:
  angosto y bajo no se lee.

## 6. Estado sin datos

Un gráfico sin datos **no muestra ejes colgados ni un lienzo en blanco**. Muestra un
bloque centrado, de la misma altura que tendría el gráfico, con:

- Un ícono de `lucide-react` en `text-muted-foreground`.
- Una línea que dice **por qué** no hay datos.
- Si hay filtros activos, la acción para limpiarlos.

```
[ícono]
Sin oportunidades en el rango seleccionado.
Probá ampliar el período o quitar el filtro de owner.
[Limpiar filtros]
```

Distinguir tres casos, con mensajes distintos:

| Caso | Mensaje |
|---|---|
| Cargando | Skeleton del alto del gráfico, sin texto |
| Sin datos | "Sin datos para..." + qué hacer |
| Error al traer | "No pudimos traer los datos" + botón de reintentar |

Una serie que existe pero vale cero **sí se dibuja**: cero es un dato (rule `dinero.md`).

## 7. Por tipo de gráfico

| Gráfico del dashboard | Tipo | Detalle |
|---|---|---|
| Evolución MRR y facturación, 24 meses | `LineChart` | Nominal sólida, real punteada. Tick cada 3 meses |
| Embudo de pipeline por etapa | `BarChart` horizontal | Orden fijo por etapa, no por monto. Etiqueta con monto y cantidad |
| Aging de cuentas por cobrar | `BarChart` apilado | Orden de buckets siempre igual, de corriente a +90 |
| Facturación por sector | `PieChart` | Máximo 7 porciones más "otros". HHI al lado, no adentro |
| CAC vs LTV por canal | `BarChart` agrupado | Dos barras por canal. Línea de referencia en LTV/CAC = 3 |
| Top 10 clientes | `BarChart` horizontal | Color por score de riesgo, con leyenda de la escala |

Notas:

- El **embudo se ordena por etapa del proceso**, nunca por monto: es un embudo, el orden
  es la información.
- En la torta de sectores, las porciones chicas se agrupan en "otros" a partir de la
  octava. Una torta con 20 porciones no comunica nada.
- En CAC vs LTV, la línea de referencia en LTV/CAC = 3 es el umbral estándar de unit
  economics sanos. Los canales por debajo se leen de un vistazo.

## 8. Accesibilidad

- Ningún gráfico comunica **solo por color**: siempre hay leyenda, etiqueta o patrón
  (punteado, orden) que lo respalde.
- La card de cada gráfico tiene título en `h2` o `h3`.
- Los gráficos que resumen una tabla que está en pantalla no necesitan tabla alterna; los
  que no, llevan el dato exportable a Excel desde la pantalla.
- Contraste de los trazos contra el fondo de la card, mínimo 3:1.
