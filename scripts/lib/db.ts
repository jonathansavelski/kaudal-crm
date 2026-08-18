/**
 * Conexion a Postgres para los scripts locales (migraciones y seed).
 *
 * Por que `pg` y no @supabase/supabase-js con la Secret key: el seed escribe
 * diez tablas encadenadas por FK. Con el cliente REST cada tabla es un request
 * independiente y no hay transaccion: si falla la insercion de cobros, quedan
 * 1400 facturas cargadas y la base a medio sembrar. Con `pg` todo entra en una
 * unica transaccion y un error deja la base exactamente como estaba.
 *
 * La rule supabase.md habla de la Secret key para el seed. Se mantiene el
 * criterio de fondo -- credencial que saltea RLS, solo local, jamas con prefijo
 * VITE_ y jamas en Netlify -- y se cambia el transporte por atomicidad. La
 * Secret key se sigue usando para lo unico que no se puede hacer por SQL: dar
 * de alta el usuario demo en Auth.
 */

import pg from 'pg'
import type { Client as ClientePg } from 'pg'

const { Client } = pg

export type ValorSql = string | number | boolean | null

/** Ref del proyecto de Supabase. Se lee de VITE_SUPABASE_URL si esta cargada. */
function refDelProyecto(): string {
  const url = process.env['VITE_SUPABASE_URL']
  if (url !== undefined && url !== '') {
    const match = /https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url)
    if (match?.[1] !== undefined) return match[1]
  }
  throw new Error('Falta VITE_SUPABASE_URL en .env: de ahi sale el ref del proyecto')
}

/**
 * Connection string del pooler de sesion. Se puede pisar entera con
 * SUPABASE_DB_URL (es lo que conviene: se copia y pega del panel, que ya trae
 * el host regional correcto).
 */
export function armarConnectionString(): string {
  const directa = process.env['SUPABASE_DB_URL']
  if (directa !== undefined && directa !== '') return directa

  const password = process.env['SUPABASE_DB_PASSWORD']
  if (password === undefined || password === '' || password.startsWith('xxxx')) {
    throw new Error(
      'Falta SUPABASE_DB_PASSWORD en .env (Supabase > Project Settings > Database > Database password). ' +
        'Alternativa: pegar la connection string completa del pooler en SUPABASE_DB_URL.',
    )
  }

  const host = process.env['SUPABASE_DB_HOST'] ?? 'aws-0-us-east-1.pooler.supabase.com'
  const puerto = process.env['SUPABASE_DB_PORT'] ?? '5432'

  return `postgresql://postgres.${refDelProyecto()}:${encodeURIComponent(password)}@${host}:${puerto}/postgres`
}

export async function conectar(): Promise<ClientePg> {
  const cliente = new Client({
    connectionString: armarConnectionString(),
    // El pooler de Supabase exige TLS y presenta un certificado propio.
    ssl: { rejectUnauthorized: false },
    application_name: 'kaudal-seed',
  })
  await cliente.connect()
  return cliente
}

/**
 * Insercion en lote. 1400 facturas de a una son 1400 round-trips contra un
 * servidor que esta a 200 ms: veinte minutos de reloj para escribir 300 KB.
 * En lotes de un par de miles de parametros, son unos pocos segundos.
 */
export async function insertarEnLote(
  cliente: ClientePg,
  tabla: string,
  columnas: readonly string[],
  filas: ReadonlyArray<readonly ValorSql[]>,
): Promise<number> {
  if (filas.length === 0) return 0

  // Postgres admite 65535 parametros por sentencia. 20000 deja margen de sobra
  // y mantiene cada lote en un tamano razonable de memoria.
  const filasPorLote = Math.max(1, Math.floor(20_000 / columnas.length))
  let insertadas = 0

  for (let inicio = 0; inicio < filas.length; inicio += filasPorLote) {
    const lote = filas.slice(inicio, inicio + filasPorLote)
    const parametros: ValorSql[] = []
    const tuplas: string[] = []

    for (const fila of lote) {
      const marcadores = fila.map((valor) => {
        parametros.push(valor)
        return `$${parametros.length}`
      })
      tuplas.push(`(${marcadores.join(', ')})`)
    }

    const sql = `insert into ${tabla} (${columnas.join(', ')}) values ${tuplas.join(', ')}`
    const resultado = await cliente.query(sql, parametros)
    insertadas += resultado.rowCount ?? lote.length
  }

  return insertadas
}

export async function contarFilas(cliente: ClientePg, tabla: string): Promise<number> {
  const resultado = await cliente.query<{ total: string }>(`select count(*)::text as total from ${tabla}`)
  return Number(resultado.rows[0]?.total ?? '0')
}
