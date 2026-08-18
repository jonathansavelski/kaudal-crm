# Rule: ui

Cómo se ve y cómo se comporta la interfaz. El criterio de fondo: **la app se va a
proyectar en una pantalla grande frente a un jurado**. Todo tiene que leerse de lejos y
nada puede aparecer roto o a medio cargar.

## 1. Toda tabla tiene tres estados

Ninguna tabla se entrega solo con el estado "hay datos". Las tres son obligatorias:

| Estado | Qué se muestra |
|---|---|
| **Cargando** | Skeleton con la forma de la tabla (mismas columnas, 5-8 filas grises). Nunca un spinner solo, nunca un salto de layout |
| **Vacío** | Texto que dice *por qué* está vacío y *qué hacer*. Con acción si corresponde |
| **Con datos** | Paginado, orden por columna y filtros |

El estado vacío tiene que ser útil, no decorativo:

```
mal:  "Sin resultados"
bien: "Ninguna cuenta cumple los filtros. Probá ampliar el rango de facturación
       o quitar el filtro de provincia."  [Limpiar filtros]
```

Distinguir vacío de error: "no hay datos" y "no pudimos traer los datos" son mensajes
distintos, y el segundo ofrece reintentar.

## 2. Tablas

- **Paginado siempre**, incluso si hoy entran 12 filas.
- Orden por cualquier columna, con indicador visible de cuál está ordenando y en qué
  sentido.
- Selector de columnas visibles en las tablas maestras.
- Cuando hay filtros activos, **contador visible** del tipo
  `37 de 120 cuentas cumplen los filtros`. El total sin filtrar también se ve.
- Los importes van alineados a la derecha con `tabular-nums` (clase `.tabular`).
  Las fechas y los textos, a la izquierda.
- La fila entera es clickeable cuando lleva a un detalle, y se ve que lo es.

## 3. Gráficos

- **Tooltip obligatorio**, con el valor formateado en `es-AR` y su etiqueta
  nominal / real / USD MEP (rule `dinero.md`). Un tooltip que muestra el número crudo
  no cumple.
- **Leyenda obligatoria** cuando hay más de una serie.
- Ejes con formato abreviado (`$ 1,2 M`), nunca el número crudo.
- Altura mínima 260 px. Contenedor responsive, nunca ancho fijo en px.
- Una serie sin datos muestra el mensaje de vacío del skill `charts-crm`, no un lienzo en
  blanco ni ejes colgados.
- El detalle de paleta, formatos y comportamiento está en `.claude/skills/charts-crm/`.

## 4. Sin emojis

**Cero emojis en la UI.** Iconografía con `lucide-react`, tamaño consistente
(`size-4` en línea de texto, `size-5` en botones, `size-6` en encabezados).

Todo ícono que va solo (sin texto al lado) lleva `aria-label`. Todo ícono decorativo que
acompaña texto lleva `aria-hidden`.

## 5. Contraste y legibilidad

- Contraste mínimo **4.5:1** para texto normal, **3:1** para texto grande y para los
  bordes de elementos de interfaz. Se verifica, no se estima a ojo.
- **El color nunca es el único portador de información.** Un estado de factura se
  distingue por texto además de por color; una serie de gráfico se distingue por leyenda.
  Vale para daltonismo y vale para un proyector que lava los colores.
- Tamaño de fuente base 14 px en tablas densas, 16 px en el resto. Nada por debajo de
  12 px.
- Los KPI del dashboard van en cifra grande (al menos `text-3xl`), con su etiqueta de
  moneda y de tipo de valor debajo, y su popover explicando la fórmula en una línea.

## 6. Estructura y estado

- Toda pantalla tiene título visible (`h1`) que coincide con el ítem del sidebar.
- Los filtros activos se ven como chips removibles, no escondidos en un panel colapsado.
- Los estados de filtro y paginado que valga la pena compartir viven en la URL
  (query params), no solo en `useState`. Si alguien manda el link, llega a la misma vista.
- Los paneles laterales (detalle de oportunidad) cierran con `Escape` y con click afuera.
- Ninguna acción destructiva sin confirmación.

## 7. Responsive

Objetivo: **notebook (1280-1440) y tablet (768-1024)**. Móvil no es requisito, pero nada
puede quedar roto ni con scroll horizontal en el body.

- El sidebar colapsa a íconos en tablet.
- Las tablas anchas scrollean horizontalmente **dentro de su contenedor**, nunca
  empujando la página.
- Las grillas de KPI y gráficos pasan de 3 columnas a 2 a 1 según ancho.

## 8. Footer global

Presente en **todas** las páginas. No es un pie olvidado: es un ítem calificable.
Lista las rules aplicadas, los skills, los agentes personalizados, el LLM utilizado
(Claude Opus 5 vía Claude Code) y el stack. Prolijo, legible y con la misma jerarquía
tipográfica que el resto de la app.
