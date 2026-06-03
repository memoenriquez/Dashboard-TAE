import { Suspense } from "react"
import { LockKeyholeIcon } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-xl shadow-primary/5 lg:grid-cols-[1fr_420px]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
          <div className="absolute right-10 top-10 size-24 rounded-full bg-brand-accent/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/10">
              <LockKeyholeIcon data-icon="inline-start" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Dashboard TAE</span>
              <span className="text-xs text-primary-foreground/70">
                Panel de recargas Telcel
              </span>
            </div>
          </div>

          <div className="relative flex max-w-md flex-col gap-4">
            <p className="text-3xl font-semibold tracking-tight text-balance">
              Consulta tus transacciones en minutos.
            </p>
            <p className="text-sm leading-6 text-primary-foreground/75">
              Entra para revisar recargas, filtrar resultados y exportar
              reportes.
            </p>
          </div>
        </section>

        <Card className="border-0 shadow-none">
          <CardHeader className="gap-3 p-8 pb-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
            <LockKeyholeIcon data-icon="inline-start" />
          </div>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Usa el correo con el que recibiste tu invitación.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
