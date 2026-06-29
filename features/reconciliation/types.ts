import type { NormalizedTransactionRecord } from "@/features/transactions/types"

export const MEXICAN_TIMEZONES = [
  "America/Bahia_Banderas",
  "America/Cancun",
  "America/Chihuahua",
  "America/Ciudad_Juarez",
  "America/Hermosillo",
  "America/Matamoros",
  "America/Mazatlan",
  "America/Merida",
  "America/Mexico_City",
  "America/Monterrey",
  "America/Ojinaga",
  "America/Tijuana",
] as const

export type MexicanTimezone = (typeof MEXICAN_TIMEZONES)[number]

export interface ReconciliationFileInput {
  reconciliationUsername: string
  filenameTimeDifference: string
  filenameDateFormat: ReconciliationDateFormat
  contentDateFormat: ReconciliationDateFormat
  reconciledDate: Date
  cutoffTimezone: MexicanTimezone
  transactions: NormalizedTransactionRecord[]
}

export interface ReconciliationFileResult {
  filename: string
  content: string
  transactionCount: number
  totalAmount: number
}

export type ReconciliationRunStatus =
  | "generated"
  | "sent"
  | "send_failed"
  | "generation_failed"

export type ReconciliationDeliveryProtocol = "sftp" | "ftp"
export type ReconciliationDateFormat = "ddmmaaaa" | "aaaammdd"

export interface ReconciliationConfig {
  id: string
  ownerClientId: string
  isEnabled: boolean
  reconciliationUsername: string | null
  cutoffTimezone: MexicanTimezone
  filenameTimeDifference: string
  filenameDateFormat: ReconciliationDateFormat
  contentDateFormat: ReconciliationDateFormat
  deliveryProtocol: ReconciliationDeliveryProtocol
  sftpEnabled: boolean
  sftpHost: string | null
  sftpPort: number
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
  createdAt: string
  updatedAt: string
}

export interface ReconciliationChildConfig {
  id: string
  configId: string
  childClientId: string
  reconciliationUsername: string
  createdAt: string
  updatedAt: string
}

export interface ReconciliationRun {
  id: string
  configId: string
  ownerClientId: string
  subjectClientId: string
  reconciledDate: string
  filename: string | null
  storagePath: string | null
  status: ReconciliationRunStatus
  transactionCount: number
  totalAmount: number
  includedExternalClientIds: number[]
  sendAttemptCount: number
  lastSendError: string | null
  fileDeletedAt: string | null
  internalError: string | null
  generatedAt: string | null
  sentAt: string | null
  createdAt: string
}

export interface UpdateReconciliationSendResultInput {
  id: string
  lastSendError?: string | null
  sentAt?: string | null
  status: "sent" | "send_failed"
}

export interface CreateReconciliationRunInput {
  configId: string
  ownerClientId: string
  subjectClientId: string
  reconciledDate: string
  filename: string | null
  storagePath: string | null
  status: ReconciliationRunStatus
  transactionCount: number
  totalAmount: number
  includedExternalClientIds: number[]
  internalError?: string | null
  generatedAt?: string | null
}

export interface ReconciliationConfigInput {
  ownerClientId: string
  isEnabled: boolean
  reconciliationUsername: string | null
  cutoffTimezone: MexicanTimezone
  filenameTimeDifference: string
  filenameDateFormat: ReconciliationDateFormat
  contentDateFormat: ReconciliationDateFormat
  deliveryProtocol: ReconciliationDeliveryProtocol
  sftpEnabled: boolean
  sftpHost: string | null
  sftpPort: number
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
  childConfigs: ReconciliationChildConfigInput[]
}

export interface ReconciliationChildConfigInput {
  childClientId: string
  reconciliationUsername: string
}
