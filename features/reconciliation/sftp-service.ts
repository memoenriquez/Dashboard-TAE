import "server-only"

import SftpClient from "ssh2-sftp-client"

import { readVaultSecret } from "@/lib/supabase/vault"

import { ReconciliationSftpError } from "./errors"
import type { ReconciliationConfig } from "./types"

export const testReconciliationSftp = async (input: {
  config: ReconciliationConfig
}) => {
  await withSftpClient(input, async () => undefined)
}

export const uploadReconciliationFileToSftp = async (input: {
  config: ReconciliationConfig
  content: string
  filename: string
}) => {
  await withSftpClient(input, async (client) => {
    const remotePath = getRemotePath(input.config, input.filename)
    const existing = await client.exists(remotePath)

    if (existing) {
      throw new ReconciliationSftpError(`Remote file already exists: ${remotePath}`)
    }

    await client.put(Buffer.from(input.content, "utf8"), remotePath)
  })
}

const withSftpClient = async (
  input: { config: ReconciliationConfig },
  callback: (client: SftpClient) => Promise<void>
) => {
  const client = new SftpClient()

  try {
    const connection = await getConnection(input)
    await client.connect(connection)
    await callback(client)
  } catch (error) {
    if (error instanceof ReconciliationSftpError) {
      throw error
    }

    throw new ReconciliationSftpError(
      error instanceof Error ? error.message : "SFTP operation failed"
    )
  } finally {
    await client.end().catch(() => undefined)
  }
}

const getConnection = async (input: {
  config: ReconciliationConfig
}) => {
  const { config } = input

  if (!config.sftpHost || !config.sftpUsername || !config.sftpPasswordSecretName) {
    throw new ReconciliationSftpError("SFTP host, username, and password secret are required")
  }

  return {
    host: config.sftpHost,
    password: await getVaultSecret(config.sftpPasswordSecretName),
    port: config.sftpPort,
    username: config.sftpUsername,
  }
}

const getVaultSecret = async (name: string) => {
  const secret = await readVaultSecret(name)

  if (typeof secret !== "string" || !secret) {
    throw new ReconciliationSftpError("SFTP password secret was not found in Vault")
  }

  return secret
}

const getRemotePath = (config: ReconciliationConfig, filename: string) => {
  if (!config.sftpRemotePath) {
    throw new ReconciliationSftpError("SFTP remote path is required")
  }

  return `${config.sftpRemotePath.replace(/\/+$/, "")}/${filename}`
}
