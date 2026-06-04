"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const checkRecoverySession = async () => {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setErrorMessage(
          "El enlace para restablecer tu contraseña no es válido o expiró."
        )
        setIsSessionReady(false)
        setHasCheckedSession(true)
        return
      }

      setIsSessionReady(true)
      setHasCheckedSession(true)
    }

    void checkRecoverySession()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.")
      return
    }

    setIsPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setIsPending(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.replace("/dashboard")
    router.refresh()
  }

  const handleReturnToLogin = () => {
    router.replace("/login")
  }

  const isFormDisabled = isPending || !isSessionReady
  const fieldHasError = Boolean(errorMessage) && isSessionReady

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {!isSessionReady ? (
        <Alert variant={errorMessage ? "destructive" : "default"}>
          <AlertTitle>
            {errorMessage ? "Enlace no válido o expirado" : "Validando enlace"}
          </AlertTitle>
          <AlertDescription>
            {errorMessage ??
              "Estamos preparando tu sesión para que puedas guardar una nueva contraseña."}
          </AlertDescription>
        </Alert>
      ) : null}

      {errorMessage && isSessionReady ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la contraseña</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-disabled={isFormDisabled} data-invalid={fieldHasError}>
          <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
          <Input
            aria-invalid={fieldHasError}
            autoComplete="new-password"
            className="bg-background"
            disabled={isFormDisabled}
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <FieldDescription>Usa al menos 8 caracteres.</FieldDescription>
        </Field>

        <Field data-disabled={isFormDisabled} data-invalid={fieldHasError}>
          <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
          <Input
            aria-invalid={fieldHasError}
            autoComplete="new-password"
            className="bg-background"
            disabled={isFormDisabled}
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
          <FieldError>{fieldHasError ? errorMessage : null}</FieldError>
        </Field>
      </FieldGroup>

      <Button disabled={isFormDisabled} type="submit">
        {isPending ? "Guardando..." : "Guardar contraseña"}
      </Button>

      {!isSessionReady && hasCheckedSession ? (
        <Button type="button" variant="link" onClick={handleReturnToLogin}>
          Volver a iniciar sesión
        </Button>
      ) : null}
    </form>
  )
}
