import type { Client } from "./types"

export class AdminValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AdminValidationError"
  }
}

export interface AdminClientInput {
  externalClientId: number | null
  displayName: string
  clientKind: Client["clientKind"]
  isActive?: boolean
}

export interface AdminGroupInput {
  parentClientId: string
  displayName: string
  childClientIds: string[]
}

export const parseAdminClientInput = (
  body: Record<string, unknown>
): AdminClientInput => {
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
  const clientKind = parseClientKind(body.clientKind)

  if (!displayName || !clientKind) {
    throw new AdminValidationError("Missing required client fields")
  }

  const externalClientId =
    body.externalClientId === null ||
    body.externalClientId === undefined ||
    body.externalClientId === ""
      ? null
      : Number(body.externalClientId)

  if (externalClientId !== null && (!Number.isInteger(externalClientId) || externalClientId < 1)) {
    throw new AdminValidationError("Invalid client id")
  }

  if (body.clientKind !== "parent" && externalClientId === null) {
    throw new AdminValidationError(
      "El ID de cliente es obligatorio para clientes Asociados e Independientes."
    )
  }

  return {
    externalClientId,
    displayName,
    clientKind,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  }
}

export const parseAdminGroupInput = (
  body: Record<string, unknown>
): AdminGroupInput => {
  const parentClientId =
    typeof body.parentClientId === "string" ? body.parentClientId.trim() : ""
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""

  if (!parentClientId || !displayName) {
    throw new AdminValidationError("Missing required group fields")
  }

  const childClientIds = Array.isArray(body.childClientIds) ? body.childClientIds : []
  const normalizedChildClientIds = childClientIds
    .filter((childClientId): childClientId is string => typeof childClientId === "string")
    .map((childClientId) => childClientId.trim())
    .filter(Boolean)

  if (normalizedChildClientIds.length === 0) {
    throw new AdminValidationError("Group requires at least one associated child client")
  }

  return {
    parentClientId,
    displayName,
    childClientIds: normalizedChildClientIds,
  }
}

const parseClientKind = (clientKind: unknown): Client["clientKind"] | null => {
  if (
    clientKind === "parent" ||
    clientKind === "child" ||
    clientKind === "standalone"
  ) {
    return clientKind
  }

  if (clientKind) {
    throw new AdminValidationError("Invalid client kind")
  }

  return null
}
