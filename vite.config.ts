import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Vendors separados: el bundle de la app se invalida sin arrastrar a React ni a
        // Supabase, y ningun chunk queda por encima del limite que avisa Vite.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              // Los ids que ve rolldown vienen siempre con barra normal, tambien en Windows.
              test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//,
            },
            { name: 'supabase', test: /node_modules\/@supabase\// },
            { name: 'datos', test: /node_modules\/(@tanstack|date-fns)\// },
            {
              // Recharts y su cadena de d3 son el bloque mas pesado del bundle y solo
              // los usan el dashboard y /mercado: van a su propio chunk.
              name: 'graficos',
              test: /node_modules\/(recharts|victory-vendor|d3-[a-z]+|internmap|decimal\.js-light|fast-equals|eventemitter3|es-toolkit)\//,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/metricas/**/*.ts'],
    },
  },
})
