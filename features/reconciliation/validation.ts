import {
  MEXICAN_TIMEZONES,
  type MexicanTimezone,
  type ReconciliationConfigInput,
} from "./types"

export class ReconciliationValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReconciliationValidationError"
  }
}

export const parseReconciliationConfigInput = (
  body: Record<string, unknown>
): ReconciliationConfigInput => {
  const ownerClientId = parseRequiredString(body.ownerClientId, "Missing owner client")
  const reconciliationUsername = parseRequiredString(
    body.reconciliationUsername,
    "Missing reconciliation username"
  )
  const cutoffTimezone = parseMexicanTimezone(body.cutoffTimezone)
  const filenameTimeDifference = parseRequiredString(
    body.filenameTimeDifference,
    "Missing filename time difference"
  )
  const sftpPort =
    body.sftpPort === undefined || body.sftpPort === null || body.sftpPort === ""
      ? 22
      : Number(body.sftpPort)

  if (!Number.isInteger(sftpPort) || sftpPort < 1 || sftpPort > 65535) {
    throw new ReconciliationValidationError("Invalid SFTP port")
  }

  const isEnabled = body.isEnabled === true
  const sftpEnabled = body.sftpEnabled === true
  const sftpHost = parseOptionalString(body.sftpHost)
  const sftpUsername = parseOptionalString(body.sftpUsername)
  const sftpRemotePath = parseOptionalString(body.sftpRemotePath)
  const sftpPasswordSecretName = parseOptionalString(body.sftpPasswordSecretName)

  if (sftpEnabled && !isEnabled) {
    throw new ReconciliationValidationError("Daily file generation must be enabled before SFTP delivery")
  }

  if (sftpEnabled && (!sftpHost || !sftpUsername || !sftpRemotePath || !sftpPasswordSecretName)) {
    throw new ReconciliationValidationError("SFTP host, user, remote path, and Vault secret are required")
  }

  return {
    ownerClientId,
    isEnabled,
    reconciliationUsername,
    cutoffTimezone,
    filenameTimeDifference,
    sftpEnabled,
    sftpHost,
    sftpPort,
    sftpUsername,
    sftpRemotePath,
    sftpPasswordSecretName,
  }
}

const parseRequiredString = (value: unknown, message: string) => {
  const parsed = typeof value === "string" ? value.trim() : ""
  if (!parsed) {
    throw new ReconciliationValidationError(message)
  }
  return parsed
}

const parseOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return null
  }

  return value.trim() || null
}

const parseMexicanTimezone = (value: unknown): MexicanTimezone => {
  const timezone = typeof value === "string" ? value.trim() : ""
  if (!MEXICAN_TIMEZONES.includes(timezone as MexicanTimezone)) {
    throw new ReconciliationValidationError("Invalid cutoff timezone")
  }
  return timezone as MexicanTimezone
}
