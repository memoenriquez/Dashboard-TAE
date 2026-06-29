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
  const reconciliationUsername = parseOptionalString(body.reconciliationUsername)
  const cutoffTimezone = parseMexicanTimezone(body.cutoffTimezone)
  const filenameTimeDifference = parseRequiredString(
    body.filenameTimeDifference,
    "Missing filename time difference"
  )
  const filenameDateFormat = parseDateFormat(body.filenameDateFormat)
  const contentDateFormat = parseDateFormat(body.contentDateFormat)
  const deliveryProtocol = body.deliveryProtocol === "ftp" ? "ftp" : "sftp"

  if (reconciliationUsername && !isValidReconciliationUsername(reconciliationUsername)) {
    throw new ReconciliationValidationError("Invalid reconciliation username")
  }

  if (!/^-?\d{1,3}$/.test(filenameTimeDifference)) {
    throw new ReconciliationValidationError("Invalid filename time difference")
  }
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
    throw new ReconciliationValidationError("Daily file generation must be enabled before delivery")
  }

  if (sftpEnabled && (!sftpHost || !sftpUsername || !sftpRemotePath || !sftpPasswordSecretName)) {
    throw new ReconciliationValidationError("Delivery host, user, remote path, and Vault secret are required")
  }

  return {
    ownerClientId,
    isEnabled,
    reconciliationUsername,
    cutoffTimezone,
    filenameTimeDifference,
    filenameDateFormat,
    contentDateFormat,
    deliveryProtocol,
    sftpEnabled,
    sftpHost,
    sftpPort,
    sftpUsername,
    sftpRemotePath,
    sftpPasswordSecretName,
    childConfigs: parseChildConfigs(body.childConfigs),
  }
}

const parseDateFormat = (value: unknown) =>
  value === "aaaammdd" ? "aaaammdd" : "ddmmaaaa"

const parseChildConfigs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const childClientId = parseRequiredString(record.childClientId, "Missing child client")
    const reconciliationUsername = parseRequiredString(
      record.reconciliationUsername,
      "Missing child reconciliation username"
    )

    if (!isValidReconciliationUsername(reconciliationUsername)) {
      throw new ReconciliationValidationError("Invalid child reconciliation username")
    }

    return { childClientId, reconciliationUsername }
  })
}

export const isValidReconciliationUsername = (value: string) =>
  /^[A-Za-z0-9_-]{1,40}$/.test(value)

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
