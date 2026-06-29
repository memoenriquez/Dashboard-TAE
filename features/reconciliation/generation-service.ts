import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Client } from "@/features/clients/types"
import type { ScopeRepository } from "@/features/clients/scope"
import { createTaeApiTransactionRepository } from "@/lib/tae-api/transactions-repository"
import type { ReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { ReconciliationGenerationError } from "./errors"
import { createReconciliationFile } from "./file-builder"
import { uploadReconciliationFileToSftp } from "./sftp-service"
import type { ReconciliationRun } from "./types"
import { isValidReconciliationUsername } from "./validation"

const BUCKET = "reconciliation-files"

export const generateReconciliationRun = async (input: {
  ownerClient: Client
  reconciledDate: string
  metadataRepository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
  supabase: SupabaseClient
}): Promise<ReconciliationRun> => {
  const result = await generateReconciliationRunResult(input)
  const firstRun = result.runs[0]?.run
  if (!firstRun) {
    throw new ReconciliationGenerationError("No reconciliation files were generated")
  }
  return firstRun
}

export interface ReconciliationRunGenerationResult {
  run: ReconciliationRun
  reused: boolean
  sftpAttempted: boolean
}

export const generateReconciliationRunResult = async (input: {
  ownerClient: Client
  reconciledDate: string
  metadataRepository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
  supabase: SupabaseClient
}): Promise<{ runs: ReconciliationRunGenerationResult[] }> => {
  const config = await input.reconciliationRepository.getConfigByOwnerClientId(
    input.ownerClient.id
  )
  if (!config || !config.isEnabled) {
    throw new ReconciliationGenerationError(
      "Activa y guarda la configuración de conciliación antes de generar archivos."
    )
  }

  const subjects = await listGenerationSubjects({
    configId: config.id,
    ownerClient: input.ownerClient,
    repository: input.metadataRepository,
    reconciliationRepository: input.reconciliationRepository,
  })

  const runs = []
  for (const subject of subjects) {
    try {
      runs.push(await generateSubjectRun({ ...input, config, subject }))
    } catch (error) {
      const failedRun = await createFailedRun({
        configId: config.id,
        ownerClientId: input.ownerClient.id,
        subjectClientId: subject.client.id,
        reconciledDate: input.reconciledDate,
        externalClientIds: subject.externalClientIds,
        error: toGenerationError(error),
        repository: input.reconciliationRepository,
      })
      if (failedRun) {
        runs.push({ run: failedRun, reused: false, sftpAttempted: false })
      }
    }
  }

  return { runs }
}

const generateSubjectRun = async (input: {
  ownerClient: Client
  reconciledDate: string
  metadataRepository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
  supabase: SupabaseClient
  config: NonNullable<Awaited<ReturnType<ReconciliationRepository["getConfigByOwnerClientId"]>>>
  subject: GenerationSubject
}): Promise<ReconciliationRunGenerationResult> => {
  const existingRun = await input.reconciliationRepository.getRunByOwnerAndDate({
    ownerClientId: input.ownerClient.id,
    subjectClientId: input.subject.client.id,
    reconciledDate: input.reconciledDate,
  })

  if (existingRun && existingRun.status !== "generation_failed") {
    return { run: existingRun, reused: true, sftpAttempted: false }
  }

  if (!input.subject.reconciliationUsername) {
    throw new ReconciliationGenerationError(
      `Missing reconciliation username for ${input.subject.client.displayName}`
    )
  }

  const externalClientIds = input.subject.externalClientIds
  let file

  try {
    const transactions = await createTaeApiTransactionRepository({
      maxAccounts: getPositiveIntegerEnv("RECONCILIATION_MAX_ACCOUNTS", 50),
      pageSizePerAccount: getPositiveIntegerEnv("RECONCILIATION_ACCOUNT_PAGE_SIZE", 500),
      maxPagesPerAccount: getPositiveIntegerEnv("RECONCILIATION_MAX_PAGES_PER_ACCOUNT", 200),
      maxRows: getPositiveIntegerEnv("RECONCILIATION_MAX_ROWS", 50_000),
    }).listTransactions({
      scope: { type: "external_client_ids", externalClientIds },
      filters: {
        from: new Date(`${input.reconciledDate}T00:00:00.000Z`),
        to: new Date(`${input.reconciledDate}T00:00:00.000Z`),
        status: "successful",
        phoneNumber: null,
        operatorName: "Telcel",
        reference: null,
      },
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    })
    file = createReconciliationFile({
      reconciliationUsername: input.subject.reconciliationUsername,
      filenameTimeDifference: input.config.filenameTimeDifference,
      filenameDateFormat: input.config.filenameDateFormat,
      contentDateFormat: input.config.contentDateFormat,
      reconciledDate: new Date(`${input.reconciledDate}T12:00:00.000Z`),
      cutoffTimezone: input.config.cutoffTimezone,
      transactions,
    })
  } catch (error) {
    throw toGenerationError(error)
  }
  const [year, month] = input.reconciledDate.split("-")
  const storagePath = `${input.ownerClient.id}/${input.subject.client.id}/${year}/${month}/${file.filename}`
  const { error: uploadError } = await input.supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.content, {
      contentType: "text/plain; charset=utf-8",
      upsert: false,
    })

  if (uploadError) {
    if (isConflictError(uploadError)) {
      const existing = await waitForExistingRun(input)
      if (existing) {
        return { run: existing, reused: true, sftpAttempted: false }
      }
    }

    throw new ReconciliationGenerationError(`No fue posible guardar el archivo: ${uploadError.message}`)
  }

  let run: ReconciliationRun
  try {
    const runInput = {
      configId: input.config.id,
      ownerClientId: input.ownerClient.id,
      subjectClientId: input.subject.client.id,
      reconciledDate: input.reconciledDate,
      filename: file.filename,
      storagePath,
      status: "generated" as const,
      transactionCount: file.transactionCount,
      totalAmount: file.totalAmount,
      includedExternalClientIds: externalClientIds,
      generatedAt: new Date().toISOString(),
    }
    run = existingRun
      ? await input.reconciliationRepository.updateGeneratedRun({ ...runInput, id: existingRun.id })
      : await input.reconciliationRepository.createRun(runInput)
  } catch (error) {
    if (isConflictError(error)) {
      const existing = await waitForExistingRun(input)
      if (existing) {
        return { run: existing, reused: true, sftpAttempted: false }
      }
    }

    throw error
  }

  if (!input.config.sftpEnabled) {
    return { run, reused: false, sftpAttempted: false }
  }

  try {
    await uploadReconciliationFileToSftp({
      config: input.config,
      content: file.content,
      filename: file.filename,
    })

    return {
      run: await input.reconciliationRepository.updateSendResult({
        id: run.id,
        sentAt: new Date().toISOString(),
        status: "sent",
      }),
      reused: false,
      sftpAttempted: true,
    }
  } catch (error) {
    return {
      run: await input.reconciliationRepository.updateSendResult({
        id: run.id,
        lastSendError: error instanceof Error ? error.message : "SFTP upload failed",
        status: "send_failed",
      }),
      reused: false,
      sftpAttempted: true,
    }
  }
}

export const retryReconciliationSftpSend = async (input: {
  reconciliationRepository: ReconciliationRepository
  run: ReconciliationRun
  supabase: SupabaseClient
}) => {
  if (!input.run.filename || !input.run.storagePath || input.run.fileDeletedAt) {
    throw new ReconciliationGenerationError("Reconciliation file is not available")
  }

  const config = await input.reconciliationRepository.getConfigByOwnerClientId(
    input.run.ownerClientId
  )
  if (!config || !config.sftpEnabled) {
    throw new ReconciliationGenerationError("SFTP is not enabled for this reconciliation")
  }

  const { data, error } = await input.supabase.storage.from(BUCKET).download(input.run.storagePath)
  if (error) {
    throw new ReconciliationGenerationError(`No fue posible leer el archivo: ${error.message}`)
  }

  try {
    await uploadReconciliationFileToSftp({
      config,
      content: await data.text(),
      filename: input.run.filename,
    })

    return input.reconciliationRepository.updateSendResult({
      id: input.run.id,
      sentAt: new Date().toISOString(),
      status: "sent",
    })
  } catch (error) {
    return input.reconciliationRepository.updateSendResult({
      id: input.run.id,
      lastSendError: error instanceof Error ? error.message : "SFTP upload failed",
      status: "send_failed",
    })
  }
}

interface GenerationSubject {
  client: Client
  externalClientIds: number[]
  reconciliationUsername: string | null
}

const listGenerationSubjects = async (input: {
  configId: string
  ownerClient: Client
  repository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
}): Promise<GenerationSubject[]> => {
  if (input.ownerClient.clientKind === "child") {
    throw new ReconciliationGenerationError("Child clients cannot own reconciliation")
  }

  if (input.ownerClient.clientKind === "standalone") {
    if (input.ownerClient.externalClientId === null) {
      throw new ReconciliationGenerationError("Standalone client is missing external id")
    }
    const config = await input.reconciliationRepository.getConfigByOwnerClientId(input.ownerClient.id)
    if (!config?.reconciliationUsername) {
      throw new ReconciliationGenerationError("Standalone client is missing reconciliation username")
    }
    return [{
      client: input.ownerClient,
      externalClientIds: [input.ownerClient.externalClientId],
      reconciliationUsername: config.reconciliationUsername,
    }]
  }

  const childClients = await input.repository.listChildClientsForParent(input.ownerClient.id)
  const childConfigs = await input.reconciliationRepository.listChildConfigsByConfigId(input.configId)
  const usernameByChildId = new Map(
    childConfigs.map((childConfig) => [childConfig.childClientId, childConfig.reconciliationUsername])
  )

  return childClients
    .filter((client) => client.isActive)
    .filter((client) => client.externalClientId !== null)
    .map((client) => {
      const reconciliationUsername = usernameByChildId.get(client.id) ?? null

      return {
        client,
        externalClientIds: [client.externalClientId as number],
        reconciliationUsername: reconciliationUsername && isValidReconciliationUsername(reconciliationUsername)
          ? reconciliationUsername
          : null,
      }
    })
}

const getPositiveIntegerEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const waitForExistingRun = async (input: {
  ownerClient: Client
  subject: GenerationSubject
  reconciledDate: string
  reconciliationRepository: ReconciliationRepository
}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existingRun = await input.reconciliationRepository.getRunByOwnerAndDate({
      ownerClientId: input.ownerClient.id,
      subjectClientId: input.subject.client.id,
      reconciledDate: input.reconciledDate,
    })

    if (existingRun) {
      return existingRun
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return null
}

const isConflictError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const record = error as { code?: unknown; message?: unknown; status?: unknown; statusCode?: unknown }
  const code = String(record.code ?? "")
  const status = String(record.status ?? record.statusCode ?? "")
  const message = String(record.message ?? "")

  return code === "23505" || status === "409" || /already exists|duplicate/i.test(message)
}

const createFailedRun = async (input: {
  configId: string
  ownerClientId: string
  subjectClientId: string
  reconciledDate: string
  externalClientIds: number[]
  error: Error
  repository: ReconciliationRepository
}): Promise<ReconciliationRun | null> => {
  try {
    const existingRun = await input.repository.getRunByOwnerAndDate({
      ownerClientId: input.ownerClientId,
      subjectClientId: input.subjectClientId,
      reconciledDate: input.reconciledDate,
    })

    if (existingRun?.status === "generation_failed") {
      return existingRun
    }

    return await input.repository.createRun({
      configId: input.configId,
      ownerClientId: input.ownerClientId,
      subjectClientId: input.subjectClientId,
      reconciledDate: input.reconciledDate,
      filename: null,
      storagePath: null,
      status: "generation_failed",
      transactionCount: 0,
      totalAmount: 0,
      includedExternalClientIds: input.externalClientIds,
      internalError: input.error.message,
    })
  } catch {
    // The original generation error is more useful than a failed error-record insert.
    return null
  }
}

const toGenerationError = (error: unknown) => {
  if (error instanceof ReconciliationGenerationError) {
    return error
  }

  if (error instanceof Error) {
    return new ReconciliationGenerationError(`No fue posible generar el archivo: ${error.message}`)
  }

  return new ReconciliationGenerationError("No fue posible generar el archivo")
}
