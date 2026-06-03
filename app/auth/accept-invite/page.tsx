import { UserPlusIcon } from "lucide-react"

import { AcceptInviteForm } from "@/components/auth/accept-invite-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AcceptInvitePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md shadow-xl shadow-primary/5">
        <CardHeader className="gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UserPlusIcon data-icon="inline-start" />
          </div>
          <CardTitle className="text-2xl">Aceptar invitación</CardTitle>
          <CardDescription>
            Crea tu contraseña para entrar al dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm />
        </CardContent>
      </Card>
    </main>
  )
}
