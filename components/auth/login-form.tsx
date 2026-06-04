"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { sanitizeInternalRedirectPath } from "@/lib/auth/redirect"
import { buildPasswordResetRedirectUrl } from "@/features/auth/password-reset"
import { getSupabaseAuthErrorMessage } from "@/lib/supabase/auth-error-message"
import { createClient } from "@/lib/supabase/client"

type LoginMode = "sign-in" | "password-reset"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeInternalRedirectPath(searchParams.get("next"))
  const [mode, setMode] = useState<LoginMode>("sign-in")
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (searchParams.get("error") === "invalid_link") {
      toast.error("El enlace no es válido o expiró. Solicita uno nuevo.")
    }
  }, [searchParams])

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    const supabase = createClient()
    const { error } = await supabase.auth
      .signInWithPassword({
        email,
        password,
      })
      .catch(() => ({
        error: { message: "No se pudo conectar con Supabase." },
      }))

    setIsPending(false)

    if (error) {
      toast.error(getSupabaseAuthErrorMessage(error, "No se pudo iniciar sesión."))
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  const handlePasswordResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const supabase = createClient()
    const { error } = await supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: buildPasswordResetRedirectUrl(window.location.origin),
      })
      .catch(() => ({
        error: { message: "No se pudo conectar con Supabase." },
      }))

    setIsPending(false)

    if (error) {
      toast.error(
        getSupabaseAuthErrorMessage(error, "No se pudo enviar el correo.")
      )
      return
    }

    toast.success("Si el correo existe, recibirás instrucciones para restablecer tu contraseña.")
  }

  const handleShowPasswordReset = () => {
    setMode("password-reset")
  }

  const handleShowSignIn = () => {
    setMode("sign-in")
  }

  if (mode === "password-reset") {
    return (
      <form className="flex flex-col gap-5" onSubmit={handlePasswordResetSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="reset-email">Correo</FieldLabel>
            <Input
              autoComplete="email"
              className="bg-background"
              disabled={isPending}
              id="reset-email"
              name="email"
              placeholder="usuario@empresa.com"
              required
              type="email"
            />
          </Field>
        </FieldGroup>

        <Button disabled={isPending} type="submit">
          {isPending ? "Enviando..." : "Enviar instrucciones"}
        </Button>

        <Button
          className="w-fit"
          disabled={isPending}
          onClick={handleShowSignIn}
          type="button"
          variant="link"
        >
          Volver a iniciar sesión
        </Button>
      </form>
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSignInSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="usuario@empresa.com"
            required
            type="email"
            className="bg-background"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            required
            type="password"
            className="bg-background"
          />
        </Field>
      </FieldGroup>

      <Button
        className="w-fit"
        disabled={isPending}
        onClick={handleShowPasswordReset}
        type="button"
        variant="link"
      >
        ¿Olvidaste tu contraseña?
      </Button>

      <Button disabled={isPending} type="submit">
        {isPending ? "Entrando..." : "Iniciar sesión"}
      </Button>
    </form>
  )
}
