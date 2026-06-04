"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { sanitizeInternalRedirectPath } from "@/lib/auth/redirect"
import { buildPasswordResetRedirectUrl } from "@/features/auth/password-reset"
import { createClient } from "@/lib/supabase/client"

type LoginMode = "sign-in" | "password-reset"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeInternalRedirectPath(searchParams.get("next"))
  const [mode, setMode] = useState<LoginMode>("sign-in")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsPending(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  const handlePasswordResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildPasswordResetRedirectUrl(window.location.origin),
    })

    setIsPending(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(
      "Si el correo existe, recibirás instrucciones para restablecer tu contraseña."
    )
  }

  const handleShowPasswordReset = () => {
    setMode("password-reset")
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleShowSignIn = () => {
    setMode("sign-in")
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  if (mode === "password-reset") {
    return (
      <form className="flex flex-col gap-5" onSubmit={handlePasswordResetSubmit}>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudo enviar el correo</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertTitle>Revisa tu correo</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field data-invalid={Boolean(errorMessage)}>
            <FieldLabel htmlFor="reset-email">Correo</FieldLabel>
            <Input
              aria-invalid={Boolean(errorMessage)}
              autoComplete="email"
              className="bg-background"
              disabled={isPending}
              id="reset-email"
              name="email"
              placeholder="usuario@empresa.com"
              required
              type="email"
            />
            <FieldError>{errorMessage}</FieldError>
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
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo iniciar sesión</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input
            aria-invalid={Boolean(errorMessage)}
            autoComplete="email"
            id="email"
            name="email"
            placeholder="usuario@empresa.com"
            required
            type="email"
            className="bg-background"
          />
        </Field>

        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            aria-invalid={Boolean(errorMessage)}
            autoComplete="current-password"
            id="password"
            name="password"
            required
            type="password"
            className="bg-background"
          />
          <FieldError>{errorMessage}</FieldError>
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
