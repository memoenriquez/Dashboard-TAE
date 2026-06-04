interface SupabaseAuthErrorLike {
  code?: string
  message?: string
  status?: number
}

export const getSupabaseAuthErrorMessage = (
  error: SupabaseAuthErrorLike,
  fallback: string
) => {
  const code = error.code?.trim()
  const message = error.message?.trim()

  if (code && authErrorMessages[code]) {
    return authErrorMessages[code]
  }

  if (message && authErrorMessages[message]) {
    return authErrorMessages[message]
  }

  if (error.status === 400 || error.status === 401) {
    return "La sesión no es válida o expiró. Vuelve a solicitar el enlace."
  }

  return fallback
}

const authErrorMessages: Record<string, string> = {
  "Auth session missing!": "La sesión no está disponible. Vuelve a iniciar sesión.",
  "Email not confirmed": "Confirma tu correo antes de iniciar sesión.",
  "Invalid Refresh Token: Refresh Token Not Found":
    "La sesión expiró. Vuelve a iniciar sesión.",
  "Invalid login credentials": "El correo o la contraseña no son correctos.",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 8 caracteres.",
  "Signup requires a valid password": "Ingresa una contraseña válida.",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión.",
  invalid_credentials: "El correo o la contraseña no son correctos.",
  invalid_grant: "La sesión no es válida o expiró. Vuelve a solicitar el enlace.",
  over_email_send_rate_limit:
    "Se enviaron demasiados correos. Espera unos minutos e intenta de nuevo.",
  same_password: "La nueva contraseña debe ser diferente a la anterior.",
  session_not_found: "La sesión expiró. Vuelve a iniciar sesión.",
  weak_password: "La contraseña no cumple los requisitos de seguridad.",
}
