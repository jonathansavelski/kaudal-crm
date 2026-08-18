# Rule: stack

Cómo se escribe el código. El stack es fijo: no se proponen alternativas ni se agregan
librerías que dupliquen algo que ya está.

## 1. TypeScript estricto de verdad

`strict: true` más `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
`noUnusedLocals`, `noUnusedParameters`.

**Prohibido `any`. Prohibido `@ts-ignore`.** No es una preferencia: oxlint los marca como
`error` (`typescript/no-explicit-any`, `typescript/ban-ts-comment`) y `npm run lint`
falla. No se silencian con un disable comment.

Cuando un tipo es genuinamente desconocido — respuesta cruda de un API externo — se usa
`unknown` y se valida antes de usar:

```ts
// mal
const datos = await res.json() as any

// bien
const crudo: unknown = await res.json()
if (!esRespuestaDolar(crudo)) throw new Error('Respuesta inesperada de dolarapi')
```

Si un tipo de tercero está mal y hace falta un escape, se escribe un type guard con su
comentario explicando el porqué. Nunca un `any` suelto.

## 2. Componentes de menos de 200 líneas

Si un componente pasa de 200 líneas, se parte. Señales de que hay que partir antes:

- Más de un `useEffect` con dependencias distintas.
- El JSX tiene más de tres niveles de condicional.
- El archivo mezcla layout con fetching con cálculo.

La partición natural: el contenedor hace fetching y arma props; los hijos son
presentacionales y reciben datos ya calculados.

## 3. Los cálculos no viven en componentes

**Todo cálculo financiero vive en `src/lib/metricas/`.** Un componente puede filtrar,
ordenar y mapear para pintar. No puede calcular una métrica.

```tsx
// mal — la fórmula queda escondida en el JSX y nadie la puede testear
<KPI valor={facturas.reduce((a, f) => a + f.monto_centavos, 0) / clientes.length} />

// bien
<KPI valor={calcularArpa(mrrCentavos, clientesActivos)} />
```

Las funciones de `src/lib/metricas/` son **puras**: reciben datos y devuelven números.
No hacen fetch, no leen del cliente de Supabase, no tocan `Date.now()` — si necesitan
"hoy", lo reciben como parámetro. Así el test es determinista.

## 4. Cada métrica tiene su test

Toda función exportada de `src/lib/metricas/` tiene su test en Vitest, en un archivo
`<modulo>.test.ts` al lado.

El test tiene que incluir **al menos un caso calculado a mano**, con el número esperado
escrito literal y un comentario que muestre la cuenta. No vale testear la función contra
sí misma.

```ts
it('pipeline ponderado: 1.000.000 en demo + 2.000.000 en propuesta', () => {
  // 1.000.000 x 0,30 + 2.000.000 x 0,50 = 300.000 + 1.000.000 = 1.300.000
  expect(calcularPipelinePonderado(oportunidades)).toBe(130_000_000) // centavos
})
```

Además, todo caso borde que la rule `dinero.md` menciona: división por cero, cartera
vacía, un solo cliente, churn cero.

## 5. Convenciones

- **Nombres en español, sin acentos ni eñe en identificadores.** `razonSocial`, no
  `businessName`. Los tipos y componentes en `PascalCase`, todo lo demás en `camelCase`.
  Archivos de componente en `PascalCase.tsx`, el resto en `kebab-case.ts`.
- **Imports con alias `@/`**, nunca rutas relativas que suban dos niveles o más.
- **`export function`, no `export default`**, salvo componentes de página (que React
  Router carga por default) y `App.tsx`.
- Nada de `console.log` en `src/`: oxlint lo marca como `error`. En `scripts/` está
  permitido, es la salida del seed.
- Los tipos generados del esquema de Supabase viven en `src/types/supabase.ts` y **no se
  editan a mano**: se regeneran.
- `src/components/ui/` es código vendored de shadcn. No se edita a mano; si hace falta
  variar algo, se envuelve en un componente propio.

## 6. Dependencias

El stack está cerrado. Antes de agregar una librería:

1. ¿Lo resuelve algo que ya está? (`date-fns` para fechas, `Intl` para formato,
   TanStack Table para tablas, Recharts para gráficos.)
2. ¿Entra al bundle del cliente? Si es solo para el seed o para scripts, va en
   `devDependencies` y **jamás se importa desde `src/`**. Caso concreto:
   `@faker-js/faker` solo se importa en `scripts/seed.ts`.

El build de producción tiene que terminar sin warnings.
