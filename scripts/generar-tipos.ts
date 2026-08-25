/**
 * Genera src/types/supabase.ts introspeccionando el esquema real.
 *
 * Por que no usamos `npx supabase gen types`: el CLI oficial no llega a este
 * proyecto. La conexion directa (db.<ref>.supabase.co) hoy solo se publica por
 * IPv6 y no resuelve desde cualquier red; contra el pooler en 5432 su probe de
 * SSL timeoutea, y en 6543 exige Docker. Introspeccionar con `pg`, que es el
 * driver que ya usamos para migraciones y seed, no depende de ninguna de esas
 * tres cosas: alcanza con SUPABASE_DB_PASSWORD.
 *
 * El archivo que produce NO se edita a mano (rule stack.md). Se regenera con
 * `npm run tipos` despues de cada migracion que cambie el esquema.
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { conectar } from './lib/db.ts'

type Columna = {
  tabla: string
  nombre: string
  tipo: string
  es_array: boolean
  nullable: boolean
  tiene_default: boolean
  es_generada: boolean
  es_vista: boolean
}

type Fk = { tabla: string; columna: string; destino: string; columna_destino: string; nombre: string }

/** Mapea un tipo de Postgres al tipo de TypeScript con el que llega por PostgREST. */
function tipoTs(pg: string, enums: Map<string, string[]>): string {
  if (enums.has(pg)) return `Database['public']['Enums']['${pg}']`
  switch (pg) {
    case 'bool':
      return 'boolean'
    // int8 (bigint) llega como number: PostgREST lo serializa a JSON. Es
    // exactamente por eso que dinero.md exige centavos enteros y no decimales.
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
      return 'number'
    case 'json':
    case 'jsonb':
      return 'Json'
    default:
      // uuid, text, varchar, date, timestamptz, time, interval: todos string.
      return 'string'
  }
}

const cliente = await conectar()

const { rows: filasEnum } = await cliente.query<{ nombre: string; valor: string }>(`
  select t.typname as nombre, e.enumlabel as valor
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder
`)
const enums = new Map<string, string[]>()
for (const f of filasEnum) enums.set(f.nombre, [...(enums.get(f.nombre) ?? []), f.valor])

const { rows: columnas } = await cliente.query<Columna>(`
  select
    c.relname                                        as tabla,
    a.attname                                        as nombre,
    coalesce(bt.typname, t.typname)                  as tipo,
    (t.typcategory = 'A')                            as es_array,
    not a.attnotnull                                 as nullable,
    (a.atthasdef and d.adbin is not null)            as tiene_default,
    (a.attidentity <> '' or a.attgenerated <> '')    as es_generada,
    (c.relkind = 'v')                                as es_vista
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  left join pg_type bt on bt.oid = t.typelem
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind in ('r', 'v') and a.attnum > 0 and not a.attisdropped
  order by c.relkind, c.relname, a.attnum
`)

const { rows: fks } = await cliente.query<Fk>(`
  select
    co.conname                as nombre,
    cl.relname                as tabla,
    att.attname               as columna,
    clf.relname               as destino,
    attf.attname              as columna_destino
  from pg_constraint co
  join pg_class cl on cl.oid = co.conrelid
  join pg_class clf on clf.oid = co.confrelid
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute att on att.attrelid = co.conrelid and att.attnum = co.conkey[1]
  join pg_attribute attf on attf.attrelid = co.confrelid and attf.attnum = co.confkey[1]
  where co.contype = 'f' and n.nspname = 'public'
  order by cl.relname, co.conname
`)

await cliente.end()

const tablas = [...new Set(columnas.filter((c) => !c.es_vista).map((c) => c.tabla))].sort()
const vistas = [...new Set(columnas.filter((c) => c.es_vista).map((c) => c.tabla))].sort()

function bloque(nombre: string, esVista: boolean): string {
  const cols = columnas.filter((c) => c.tabla === nombre)
  const ts = (c: Columna) => tipoTs(c.tipo, enums) + (c.es_array ? '[]' : '') + (c.nullable ? ' | null' : '')

  const row = cols.map((c) => `          ${c.nombre}: ${ts(c)}`).join('\n')

  if (esVista) {
    return `      ${nombre}: {\n        Row: {\n${row}\n        }\n        Relationships: []\n      }`
  }

  // Insert: opcional si tiene default, es generada o admite null.
  const insert = cols
    .map((c) => `          ${c.nombre}${c.tiene_default || c.es_generada || c.nullable ? '?' : ''}: ${ts(c)}`)
    .join('\n')
  const update = cols.map((c) => `          ${c.nombre}?: ${ts(c)}`).join('\n')

  const rels = fks
    .filter((f) => f.tabla === nombre)
    .map(
      (f) =>
        `          {\n` +
        `            foreignKeyName: '${f.nombre}'\n` +
        `            columns: ['${f.columna}']\n` +
        `            isOneToOne: false\n` +
        `            referencedRelation: '${f.destino}'\n` +
        `            referencedColumns: ['${f.columna_destino}']\n` +
        `          }`,
    )
    // Los elementos de un tuple, en posicion de tipo, van separados por coma.
    .join(',\n')

  return (
    `      ${nombre}: {\n` +
    `        Row: {\n${row}\n        }\n` +
    `        Insert: {\n${insert}\n        }\n` +
    `        Update: {\n${update}\n        }\n` +
    `        Relationships: [\n${rels}\n        ]\n` +
    `      }`
  )
}

const salida = `/**
 * GENERADO AUTOMATICAMENTE - NO EDITAR A MANO (rule stack.md).
 * Se regenera con \`npm run tipos\` despues de cada migracion.
 * Fuente: introspeccion del esquema public via scripts/generar-tipos.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
${tablas.map((t) => bloque(t, false)).join('\n')}
    }
    Views: {
${vistas.map((v) => bloque(v, true)).join('\n')}
    }
    Functions: Record<string, never>
    Enums: {
${[...enums.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([n, vs]) => `      ${n}: ${vs.map((v) => `'${v}'`).join(' | ')}`)
  .join('\n')}
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
`

writeFileSync('src/types/supabase.ts', salida, 'utf8')
console.log(
  `src/types/supabase.ts generado: ${tablas.length} tablas, ${vistas.length} vista(s), ` +
    `${enums.size} enums, ${fks.length} relaciones.`,
)
