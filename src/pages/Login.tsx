import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CircleAlert, KeyRound, LoaderCircle, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PantallaCarga } from '@/components/layout/PantallaCarga'
import { PieGlobal } from '@/components/layout/PieGlobal'
import { useSesion } from '@/hooks/use-sesion'
import { CREDENCIALES_DEMO, iniciarSesion } from '@/lib/auth'

/** De donde venia el usuario antes de que el guard lo mandara al login. */
function destinoDe(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'desde' in estado) {
    const desde = (estado as { desde: unknown }).desde
    if (typeof desde === 'string' && desde.startsWith('/') && desde !== '/login') return desde
  }

  return '/'
}

export default function Login() {
  const { sesion, cargando } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const [email, setEmail] = useState<string>(CREDENCIALES_DEMO.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destino = destinoDe(ubicacion.state)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)

    const mensaje = await iniciarSesion(email.trim(), password)
    if (mensaje) {
      setError(mensaje)
      setEnviando(false)
      return
    }

    navegar(destino, { replace: true })
  }

  if (cargando) return <PantallaCarga mensaje="Verificando la sesión…" />
  if (sesion) return <Navigate to={destino} replace />

  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Waves className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xl font-semibold tracking-tight">Kaudal CRM</p>
              <p className="text-sm text-muted-foreground">
                CRM comercial de Nodus — nominal, real y USD MEP
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingresar</CardTitle>
              <CardDescription>
                Acceso con el usuario demo del trabajo práctico. La sesión queda persistida.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={(evento) => void enviar(evento)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    aria-invalid={error !== null}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                    aria-invalid={error !== null}
                  />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-negativo/50 bg-negativo/5 px-3 py-2 text-sm text-foreground"
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-negativo" aria-hidden />
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <KeyRound className="size-4" aria-hidden />
                  )}
                  {enviando ? 'Ingresando…' : 'Ingresar'}
                </Button>
              </form>

              <div className="mt-6 rounded-md border border-dashed bg-muted/40 p-3 text-sm">
                <p className="font-medium">Usuario demo</p>
                <p className="tabular mt-1 text-muted-foreground">
                  {CREDENCIALES_DEMO.email} · {CREDENCIALES_DEMO.password}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setEmail(CREDENCIALES_DEMO.email)
                    setPassword(CREDENCIALES_DEMO.password)
                    setError(null)
                  }}
                >
                  Completar con el usuario demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PieGlobal />
    </div>
  )
}
