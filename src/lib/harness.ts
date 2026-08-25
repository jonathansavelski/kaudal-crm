/**
 * Contenido del footer global. Vive fuera del componente porque es texto, no layout, y
 * porque el footer es un item calificable: describe con que se construyo la app.
 *
 * Cada entrada refleja un archivo que existe de verdad en `.claude/`.
 */

export type EntradaHarness = {
  nombre: string
  detalle: string
}

export type GrupoHarness = {
  titulo: string
  ruta: string
  entradas: readonly EntradaHarness[]
}

export const RULES: GrupoHarness = {
  titulo: 'Rules aplicadas',
  ruta: '.claude/rules/',
  entradas: [
    {
      nombre: 'dinero.md',
      detalle:
        'La plata es entera en centavos y viaja con su moneda. Toda cifra se etiqueta nominal, real o USD MEP. Redondeo solo al presentar.',
    },
    {
      nombre: 'stack.md',
      detalle:
        'TypeScript estricto sin any ni @ts-ignore, componentes de menos de 200 líneas y los cálculos financieros fuera de la UI.',
    },
    {
      nombre: 'supabase.md',
      detalle:
        'RLS habilitada en las diez tablas, queries tipadas contra el esquema y la secret key fuera del bundle y del repo.',
    },
    {
      nombre: 'ui.md',
      detalle:
        'Tres estados en cada tabla y cada gráfico, tooltips y leyendas obligatorios, cero emojis y contraste verificado.',
    },
  ],
}

export const SKILLS: GrupoHarness = {
  titulo: 'Skills',
  ruta: '.claude/skills/',
  entradas: [
    {
      nombre: 'metricas-financieras',
      detalle:
        'Diccionario canónico de fórmulas: pipeline ponderado, MRR, NRR, DSO, aging, VAN, HHI, ECL y score de riesgo. Fuente de verdad única.',
    },
    {
      nombre: 'seed-financiero',
      detalle:
        'Cómo generar datos fake creíbles: montos log-normales, coherencia temporal estricta, mora concentrada y estacionalidad argentina.',
    },
    {
      nombre: 'charts-crm',
      detalle:
        'Convenciones de Recharts: paleta por CSS var, ejes abreviados, tooltip con etiqueta de tipo de valor y estado sin datos.',
    },
  ],
}

export const AGENTES: GrupoHarness = {
  titulo: 'Agentes personalizados',
  ruta: '.claude/agents/',
  entradas: [
    {
      nombre: 'arquitecto-datos',
      detalle: 'Esquema, migraciones SQL, índices y políticas RLS. No toca el front.',
    },
    {
      nombre: 'analista-financiero',
      detalle: 'Audita cada fórmula contra el skill y revisa los tests. No toca la UI.',
    },
    {
      nombre: 'frontend-crm',
      detalle: 'Pantallas y componentes, siguiendo ui.md y charts-crm.',
    },
    {
      nombre: 'qa-datos',
      detalle:
        'Integridad referencial del seed y que todo agregado cuadre con la suma del detalle.',
    },
  ],
}

/** El stack de la tabla de `CLAUDE.md`, tal cual. */
export const STACK: readonly EntradaHarness[] = [
  { nombre: 'Build', detalle: 'Vite 8 + React 19 + TypeScript 6 estricto' },
  { nombre: 'Ruteo', detalle: 'React Router v6' },
  { nombre: 'Estilos', detalle: 'Tailwind CSS v4 + shadcn/ui (new-york)' },
  { nombre: 'Tablas', detalle: 'TanStack Table' },
  { nombre: 'Fetching', detalle: 'TanStack Query' },
  { nombre: 'Gráficos', detalle: 'Recharts' },
  { nombre: 'Backend', detalle: 'Supabase — Postgres, Auth y RLS' },
  { nombre: 'Fechas', detalle: 'date-fns, locale es' },
  { nombre: 'Excel', detalle: 'SheetJS (xlsx)' },
  { nombre: 'Seed', detalle: '@faker-js/faker locale es_AR + tsx' },
  { nombre: 'Tests', detalle: 'Vitest' },
  { nombre: 'Lint', detalle: 'oxlint' },
  { nombre: 'Deploy', detalle: 'Netlify (SPA estática)' },
]

export const LLM = {
  modelo: 'Claude Opus 5',
  herramienta: 'Claude Code',
  detalle:
    'Harness propio de rules, skills y agentes: cada fase la ejecutó el agente de su especialidad.',
}
