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
import { getInviteSessionFromHash } from "@/features/auth/invite-session"
import { createClient } from "@/lib/supabase/client"

export function AcceptInviteForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const initializeInviteSession = async () => {
      const supabase = createClient()
      const tokens = getInviteSessionFromHash(window.location.hash)

      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        })

        window.history.replaceState(null, "", window.location.pathname)

        if (error) {
          setErrorMessage(error.message)
          setIsSessionReady(false)
          return
        }

        setIsSessionReady(true)
        router.refresh()
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsSessionReady(Boolean(user))
    }

    void initializeInviteSession()
  }, [router])

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

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {!isSessionReady ? (
        <Alert variant={errorMessage ? "destructive" : "default"}>
          <AlertTitle>
            {errorMessage ? "Invitación no válida o expirada" : "Validando invitación"}
          </AlertTitle>
          <AlertDescription>
            {errorMessage ??
              "Estamos preparando tu sesión para que puedas crear tu contraseña."}
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
        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
          <Input
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            className="bg-background"
            disabled={isPending || !isSessionReady}
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <FieldDescription>
            Usa al menos 8 caracteres.
          </FieldDescription>
        </Field>

        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
          <Input
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            className="bg-background"
            disabled={isPending || !isSessionReady}
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
          <FieldError>{errorMessage}</FieldError>
        </Field>
      </FieldGroup>

      <Button disabled={isPending || !isSessionReady} type="submit">
        {isPending ? "Guardando..." : "Crear contraseña y entrar"}
      </Button>
    </form>
  )
}
