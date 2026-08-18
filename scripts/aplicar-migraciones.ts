/**
 * Aplica supabase/migrations/*.sql en orden, todas dentro de UNA transaccion.
 *
 * Si la 0003 falla, la 0001 y la 0002 se van con ella: no queda un proyecto a
 * medio migrar, que es el estado mas dificil de diagnosticar. Las migraciones
 * estan escritas para poder re-correrse sobre un proyecto limpio ("if not
 * exists", "drop policy if exists"), asi que volver a ejecutar este script es
 * seguro.
 *
 * Uso:  npx tsx scripts/aplicar-migraciones.ts
 */

import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { conectar } from './lib/db.ts'

async function main(): Promise<void> {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const carpeta = path.join(raiz, 'supabase', 'migrations')

  const archivos = (await readdir(carpeta)).filter((nombre) => nombre.endsWith('.sql')).sort()
  if (archivos.length === 0) throw new Error(`No hay migraciones en ${carpeta}`)

  console.log(`Aplicando ${archivos.length} migraciones sobre el proyecto de Supabase...`)

  const cliente = await conectar()
  try {
    await cliente.query('begin')
    for (const archivo of archivos) {
      const sql = await readFile(path.join(carpeta, archivo), 'utf8')
      const desde = Date.now()
      await cliente.query(sql)
      console.log(`  ${archivo.padEnd(20)} ok (${Date.now() - desde} ms)`)
    }
    await cliente.query('commit')
    console.log('\nMigraciones aplicadas. Acordate de regenerar los tipos:')
    console.log('  npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts')
  } catch (error: unknown) {
    await cliente.query('rollback')
    throw error
  } finally {
    await cliente.end()
  }
}

main().catch((error: unknown) => {
  console.error('\nLas migraciones fallaron y se revirtieron enteras.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
