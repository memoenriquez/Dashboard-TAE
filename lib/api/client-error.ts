export const readApiErrorMessage = async (
  response: Response,
  fallback: string
) => {
  const payload = (await response.json().catch(() => null)) as {
    error?: unknown
  } | null

  if (typeof payload?.error !== "string" || !payload.error.trim()) {
    return fallback
  }

  return normalizeApiErrorMessage(payload.error, fallback)
}

const apiErrorMessages: Record<string, string> = {
  "A valid email is required": "Ingresa un correo válido.",
  "Auth user not found": "No se encontró el usuario de autenticación.",
  "Client is required": "Selecciona un cliente.",
  "Client profiles must be linked to a client":
    "Los usuarios cliente deben estar vinculados a un cliente.",
  "Display name is required": "Ingresa el nombre visible.",
  Forbidden: "No tienes permisos para realizar esta acción.",
  "Group members must be active child clients":
    "Los integrantes del grupo deben ser clientes asociados activos.",
  "Group parent must be a parent client":
    "El cliente principal del grupo debe ser de tipo Principal.",
  "Group requires at least one associated child client":
    "El grupo requiere al menos un cliente asociado.",
  "Invalid client id": "El ID de cliente no es válido.",
  "Invalid client kind": "El tipo de cliente no es válido.",
  "Missing client id": "Falta el ID del cliente.",
  "Missing group id": "Falta el ID del grupo.",
  "Missing profile id": "Falta el ID del usuario.",
  "Missing required client fields": "Completa los datos obligatorios del cliente.",
  "Missing required group fields": "Completa los datos obligatorios del grupo.",
  "Missing required profile fields": "Completa los datos obligatorios del usuario.",
  "Only the current dashboard owner can be an internal admin":
    "Solo el propietario actual del dashboard puede ser administrador interno.",
  "Profile not found": "No se encontró el usuario.",
  "Selected client does not exist": "El cliente seleccionado no existe.",
  "Selected client is inactive": "El cliente seleccionado está inactivo.",
  "This user already accepted the invitation":
    "Este usuario ya aceptó la invitación.",
  "This user does not have a valid email address":
    "Este usuario no tiene un correo válido.",
  "Transaction not found": "No se encontró la transacción.",
  Unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
  "Unexpected error": "Ocurrió un error inesperado. Intenta nuevamente.",
}

const normalizeApiErrorMessage = (message: string, fallback: string) => {
  const trimmedMessage = message.trim()
  return apiErrorMessages[trimmedMessage] ?? trimmedMessage ?? fallback
}
