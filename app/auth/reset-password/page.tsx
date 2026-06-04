import { KeyRoundIcon } from "lucide-react"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md shadow-xl shadow-primary/5">
        <CardHeader className="gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRoundIcon data-icon="inline-start" />
          </div>
          <CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
          <CardDescription>
            Crea una nueva contraseña para volver a entrar al dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  )
}
