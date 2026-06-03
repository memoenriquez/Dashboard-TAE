export type ResponseCodeSeverity = "success" | "error" | "warning" | "unknown"

export interface ResponseCodeCatalogEntry {
  code: string
  label: string
  description: string
  severity: ResponseCodeSeverity
}

const RESPONSE_CODE_CATALOG: Record<string, Omit<ResponseCodeCatalogEntry, "code">> = {
  "0": {
    label: "Éxito",
    description: "La operación fue aceptada como exitosa por el servicio TAE.",
    severity: "success",
  },
  "1": {
    label: "Estado técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "2": {
    label: "Estado técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "3": {
    label: "Fracaso",
    description:
      "La operación fue rechazada o falló. Usa la respuesta de proveedor para diagnosticar la causa específica.",
    severity: "error",
  },
  "4": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "5": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "6": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "7": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "8": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
  "9": {
    label: "Error técnico de consulta",
    description:
      "Código documentado por el Servicio API TAE para estados o errores técnicos de consulta.",
    severity: "warning",
  },
}

export const getResponseCodeCatalogEntry = (
  code: string
): ResponseCodeCatalogEntry => {
  const normalizedCode = code.trim()
  const entry = RESPONSE_CODE_CATALOG[normalizedCode]

  if (!entry) {
    return {
      code: normalizedCode,
      label: "Código no catalogado",
      description:
        "El sistema devolvió un código que no está descrito en el catálogo documentado.",
      severity: "unknown",
    }
  }

  return {
    code: normalizedCode,
    ...entry,
  }
}
