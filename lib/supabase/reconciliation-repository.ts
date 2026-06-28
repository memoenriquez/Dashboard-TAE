import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  CreateReconciliationRunInput,
  ReconciliationConfig,
  ReconciliationConfigInput,
  ReconciliationRun,
  UpdateReconciliationSendResultInput,
} from "@/features/reconciliation/types"

type JsonRecord = Record<string, unknown>

export interface ReconciliationRepository {
  listConfigs: () => Promise<ReconciliationConfig[]>
  listRuns: () => Promise<ReconciliationRun[]>
  listRunsWithFilesBeforeDate: (date: string) => Promise<ReconciliationRun[]>
  getConfigByOwnerClientId: (ownerClientId: string) => Promise<ReconciliationConfig | null>
  upsertConfig: (input: ReconciliationConfigInput) => Promise<ReconciliationConfig>
  listRunsByOwnerClientId: (ownerClientId: string) => Promise<ReconciliationRun[]>
  getRunById: (id: string) => Promise<ReconciliationRun | null>
  getRunByOwnerAndDate: (input: {
    ownerClientId: string
    reconciledDate: string
  }) => Promise<ReconciliationRun | null>
  createRun: (input: CreateReconciliationRunInput) => Promise<ReconciliationRun>
  markRunFileDeleted: (input: { id: string; fileDeletedAt: string }) => Promise<void>
  updateSendResult: (input: UpdateReconciliationSendResultInput) => Promise<ReconciliationRun>
}

export const createReconciliationRepository = (
  supabase: SupabaseClient
): ReconciliationRepository => ({
  listConfigs: async () => {
    const { data, error } = await supabase
      .from("reconciliation_configs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapConfig)
  },
  listRuns: async () => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .select("*")
      .order("reconciled_date", { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapRun)
  },
  listRunsWithFilesBeforeDate: async (date) => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .select("*")
      .lt("reconciled_date", date)
      .not("storage_path", "is", null)
      .is("file_deleted_at", null)
      .order("reconciled_date", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapRun)
  },
  getConfigByOwnerClientId: async (ownerClientId) => {
    const { data, error } = await supabase
      .from("reconciliation_configs")
      .select("*")
      .eq("owner_client_id", ownerClientId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapConfig(data as JsonRecord) : null
  },
  upsertConfig: async (input) => {
    const { data, error } = await supabase
      .from("reconciliation_configs")
      .upsert(
        {
          owner_client_id: input.ownerClientId,
          is_enabled: input.isEnabled,
          reconciliation_username: input.reconciliationUsername,
          cutoff_timezone: input.cutoffTimezone,
          filename_time_difference: input.filenameTimeDifference,
          sftp_enabled: input.sftpEnabled,
          sftp_host: input.sftpHost,
          sftp_port: input.sftpPort,
          sftp_username: input.sftpUsername,
          sftp_remote_path: input.sftpRemotePath,
          sftp_password_secret_name: input.sftpPasswordSecretName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_client_id" }
      )
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapConfig(data as JsonRecord)
  },
  listRunsByOwnerClientId: async (ownerClientId) => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .select("*")
      .eq("owner_client_id", ownerClientId)
      .order("reconciled_date", { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as JsonRecord[]).map(mapRun)
  },
  getRunById: async (id) => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapRun(data as JsonRecord) : null
  },
  getRunByOwnerAndDate: async (input) => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .select("*")
      .eq("owner_client_id", input.ownerClientId)
      .eq("reconciled_date", input.reconciledDate)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapRun(data as JsonRecord) : null
  },
  createRun: async (input) => {
    const { data, error } = await supabase
      .from("reconciliation_runs")
      .insert({
        config_id: input.configId,
        owner_client_id: input.ownerClientId,
        reconciled_date: input.reconciledDate,
        filename: input.filename,
        storage_path: input.storagePath,
        status: input.status,
        transaction_count: input.transactionCount,
        total_amount: input.totalAmount,
        included_external_client_ids: input.includedExternalClientIds,
        internal_error: input.internalError ?? null,
        generated_at: input.generatedAt ?? null,
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapRun(data as JsonRecord)
  },
  markRunFileDeleted: async (input) => {
    const { error } = await supabase
      .from("reconciliation_runs")
      .update({ file_deleted_at: input.fileDeletedAt })
      .eq("id", input.id)

    if (error) {
      throw error
    }
  },
  updateSendResult: async (input) => {
    const existing = await createReconciliationRepository(supabase).getRunById(input.id)

    const { data, error } = await supabase
      .from("reconciliation_runs")
      .update({
        last_send_error: input.lastSendError ?? null,
        send_attempt_count: (existing?.sendAttemptCount ?? 0) + 1,
        sent_at: input.sentAt ?? null,
        status: input.status,
      })
      .eq("id", input.id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapRun(data as JsonRecord)
  },
})

const mapConfig = (row: JsonRecord): ReconciliationConfig => ({
  id: String(row.id),
  ownerClientId: String(row.owner_client_id),
  isEnabled: Boolean(row.is_enabled),
  reconciliationUsername: String(row.reconciliation_username),
  cutoffTimezone: row.cutoff_timezone as ReconciliationConfig["cutoffTimezone"],
  filenameTimeDifference: String(row.filename_time_difference),
  sftpEnabled: Boolean(row.sftp_enabled),
  sftpHost: row.sftp_host ? String(row.sftp_host) : null,
  sftpPort: Number(row.sftp_port),
  sftpUsername: row.sftp_username ? String(row.sftp_username) : null,
  sftpRemotePath: row.sftp_remote_path ? String(row.sftp_remote_path) : null,
  sftpPasswordSecretName: row.sftp_password_secret_name
    ? String(row.sftp_password_secret_name)
    : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapRun = (row: JsonRecord): ReconciliationRun => ({
  id: String(row.id),
  configId: String(row.config_id),
  ownerClientId: String(row.owner_client_id),
  reconciledDate: String(row.reconciled_date),
  filename: row.filename ? String(row.filename) : null,
  storagePath: row.storage_path ? String(row.storage_path) : null,
  status: row.status as ReconciliationRun["status"],
  transactionCount: Number(row.transaction_count),
  totalAmount: Number(row.total_amount),
  includedExternalClientIds: Array.isArray(row.included_external_client_ids)
    ? row.included_external_client_ids.map(Number)
    : [],
  sendAttemptCount: Number(row.send_attempt_count),
  lastSendError: row.last_send_error ? String(row.last_send_error) : null,
  fileDeletedAt: row.file_deleted_at ? String(row.file_deleted_at) : null,
  internalError: row.internal_error ? String(row.internal_error) : null,
  generatedAt: row.generated_at ? String(row.generated_at) : null,
  sentAt: row.sent_at ? String(row.sent_at) : null,
  createdAt: String(row.created_at),
})
