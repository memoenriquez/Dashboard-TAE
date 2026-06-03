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
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeInternalRedirectPath(searchParams.get("next"))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
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

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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

      <Button disabled={isPending} type="submit">
        {isPending ? "Entrando..." : "Iniciar sesión"}
      </Button>
    </form>
  )
}
