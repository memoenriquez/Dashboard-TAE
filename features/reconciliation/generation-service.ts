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

const BUCKET = "reconciliation-files"

export const generateReconciliationRun = async (input: {
  ownerClient: Client
  reconciledDate: string
  metadataRepository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
  supabase: SupabaseClient
}): Promise<ReconciliationRun> => {
  const result = await generateReconciliationRunResult(input)
  return result.run
}

export const generateReconciliationRunResult = async (input: {
  ownerClient: Client
  reconciledDate: string
  metadataRepository: ScopeRepository
  reconciliationRepository: ReconciliationRepository
  supabase: SupabaseClient
}): Promise<{ run: ReconciliationRun; reused: boolean; sftpAttempted: boolean }> => {
  const existingRun = await input.reconciliationRepository.getRunByOwnerAndDate({
    ownerClientId: input.ownerClient.id,
    reconciledDate: input.reconciledDate,
  })

  if (existingRun) {
    return { run: existingRun, reused: true, sftpAttempted: false }
  }

  const config = await input.reconciliationRepository.getConfigByOwnerClientId(
    input.ownerClient.id
  )
  if (!config || !config.isEnabled) {
    throw new ReconciliationGenerationError(
      "Activa y guarda la configuración de conciliación antes de generar archivos."
    )
  }

  const externalClientIds = await listIncludedExternalClientIds({
    ownerClient: input.ownerClient,
    repository: input.metadataRepository,
  })
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
      reconciliationUsername: config.reconciliationUsername,
      filenameTimeDifference: config.filenameTimeDifference,
      reconciledDate: new Date(`${input.reconciledDate}T12:00:00.000Z`),
      cutoffTimezone: config.cutoffTimezone,
      transactions,
    })
  } catch (error) {
    const generationError = toGenerationError(error)
    await createFailedRun({
      configId: config.id,
      ownerClientId: input.ownerClient.id,
      reconciledDate: input.reconciledDate,
      externalClientIds,
      error: generationError,
      repository: input.reconciliationRepository,
    })
    throw generationError
  }
  const [year, month] = input.reconciledDate.split("-")
  const storagePath = `${input.ownerClient.id}/${year}/${month}/${file.filename}`
  const { error: uploadError } = await input.supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.content, {
      contentType: "text/plain; charset=utf-8",
      upsert: false,
    })

  if (uploadError) {
    const generationError = new ReconciliationGenerationError(
      `No fue posible guardar el archivo: ${uploadError.message}`
    )
    await createFailedRun({
      configId: config.id,
      ownerClientId: input.ownerClient.id,
      reconciledDate: input.reconciledDate,
      externalClientIds,
      error: generationError,
      repository: input.reconciliationRepository,
    })
    throw generationError
  }

  const run = await input.reconciliationRepository.createRun({
    configId: config.id,
    ownerClientId: input.ownerClient.id,
    reconciledDate: input.reconciledDate,
    filename: file.filename,
    storagePath,
    status: "generated",
    transactionCount: file.transactionCount,
    totalAmount: file.totalAmount,
    includedExternalClientIds: externalClientIds,
    generatedAt: new Date().toISOString(),
  })

  if (!config.sftpEnabled) {
    return { run, reused: false, sftpAttempted: false }
  }

  try {
    await uploadReconciliationFileToSftp({
      config,
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

const listIncludedExternalClientIds = async (input: {
  ownerClient: Client
  repository: ScopeRepository
}) => {
  if (input.ownerClient.clientKind === "child") {
    throw new ReconciliationGenerationError("Child clients cannot own reconciliation")
  }

  if (input.ownerClient.clientKind === "standalone") {
    if (input.ownerClient.externalClientId === null) {
      throw new ReconciliationGenerationError("Standalone client is missing external id")
    }
    return [input.ownerClient.externalClientId]
  }

  const childClients = await input.repository.listChildClientsForParent(input.ownerClient.id)
  const parentExternalIds =
    input.ownerClient.externalClientId === null ? [] : [input.ownerClient.externalClientId]

  return Array.from(
    new Set(
      [
        ...parentExternalIds,
        ...childClients
          .filter((client) => client.isActive)
          .map((client) => client.externalClientId)
          .filter((externalClientId): externalClientId is number => externalClientId !== null),
      ]
    )
  )
}

const getPositiveIntegerEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const createFailedRun = async (input: {
  configId: string
  ownerClientId: string
  reconciledDate: string
  externalClientIds: number[]
  error: Error
  repository: ReconciliationRepository
}) => {
  try {
    await input.repository.createRun({
      configId: input.configId,
      ownerClientId: input.ownerClientId,
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
