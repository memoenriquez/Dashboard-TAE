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

export interface ReconciliationConfig {
  id: string
  ownerClientId: string
  isEnabled: boolean
  reconciliationUsername: string
  cutoffTimezone: MexicanTimezone
  filenameTimeDifference: string
  sftpEnabled: boolean
  sftpHost: string | null
  sftpPort: number
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
  createdAt: string
  updatedAt: string
}

export interface ReconciliationRun {
  id: string
  configId: string
  ownerClientId: string
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

export interface CreateReconciliationRunInput {
  configId: string
  ownerClientId: string
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
  reconciliationUsername: string
  cutoffTimezone: MexicanTimezone
  filenameTimeDifference: string
  sftpEnabled: boolean
  sftpHost: string | null
  sftpPort: number
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
}
