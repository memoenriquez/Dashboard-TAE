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

export const parseAdminClientInput = (body: Partial<{
  externalClientId: number | string | null
  displayName: string
  clientKind: Client["clientKind"]
  isActive: boolean
}>): AdminClientInput => {
  const displayName = body.displayName?.trim()

  if (!displayName || !body.clientKind) {
    throw new AdminValidationError("Missing required client fields")
  }

  if (!["parent", "child", "standalone"].includes(body.clientKind)) {
    throw new AdminValidationError("Invalid client kind")
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
    clientKind: body.clientKind,
    isActive: body.isActive,
  }
}

export const parseAdminGroupInput = (body: Partial<{
  parentClientId: string
  displayName: string
  childClientIds: string[]
}>): AdminGroupInput => {
  const parentClientId = body.parentClientId?.trim()
  const displayName = body.displayName?.trim()

  if (!parentClientId || !displayName) {
    throw new AdminValidationError("Missing required group fields")
  }

  const childClientIds = body.childClientIds ?? []
  const normalizedChildClientIds = childClientIds
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
