import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProveedorSesion } from '@/components/auth/ProveedorSesion'
import { RutaProtegida } from '@/components/auth/RutaProtegida'
import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal'
import Acciones from '@/pages/Acciones'
import Cobranzas from '@/pages/Cobranzas'
import CuentaDetalle from '@/pages/CuentaDetalle'
import Cuentas from '@/pages/Cuentas'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Mercado from '@/pages/Mercado'
import NoEncontrada from '@/pages/NoEncontrada'
import Pipeline from '@/pages/Pipeline'

/**
 * Raiz de la app: cliente de TanStack Query, router y proveedor de sesion.
 *
 * `ProveedorSesion` va adentro del `QueryClientProvider` porque al cerrar sesion limpia
 * la cache; y adentro del router porque el guard navega.
 */

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos financieros que no cambian dentro de una sesion de uso: un minuto alcanza.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter>
        <ProveedorSesion>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RutaProtegida />}>
              <Route element={<LayoutPrincipal />}>
                <Route index element={<Dashboard />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="cuentas" element={<Cuentas />} />
                <Route path="cuentas/:id" element={<CuentaDetalle />} />
                <Route path="cobranzas" element={<Cobranzas />} />
                <Route path="acciones" element={<Acciones />} />
                <Route path="mercado" element={<Mercado />} />
                <Route path="*" element={<NoEncontrada />} />
              </Route>
            </Route>
          </Routes>
        </ProveedorSesion>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
