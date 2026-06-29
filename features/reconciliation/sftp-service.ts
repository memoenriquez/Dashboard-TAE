import "server-only"

import { Client as FtpClient } from "basic-ftp"
import SftpClient from "ssh2-sftp-client"
import { Readable } from "stream"

import { readVaultSecret } from "@/lib/supabase/vault"

import { ReconciliationSftpError } from "./errors"
import type { ReconciliationConfig } from "./types"

export const testReconciliationSftp = async (input: {
  config: ReconciliationConfig
}) => {
  if (input.config.deliveryProtocol === "ftp") {
    await withFtpClient(input, async () => undefined)
    return
  }

  await withSftpClient(input, async () => undefined)
}

export const uploadReconciliationFileToSftp = async (input: {
  config: ReconciliationConfig
  content: string
  filename: string
}) => {
  if (input.config.deliveryProtocol === "ftp") {
    await uploadReconciliationFileToFtp(input)
    return
  }

  await withSftpClient(input, async (client) => {
    const remotePath = getRemotePath(input.config, input.filename)
    const existing = await client.exists(remotePath)

    if (existing) {
      throw new ReconciliationSftpError(`Remote file already exists: ${remotePath}`)
    }

    await client.put(Buffer.from(input.content, "utf8"), remotePath)
  })
}

const uploadReconciliationFileToFtp = async (input: {
  config: ReconciliationConfig
  content: string
  filename: string
}) => {
  await withFtpClient(input, async (client) => {
    const remotePath = getRemotePath(input.config, input.filename)
    const size = await client.size(remotePath).catch(() => -1)

    if (size >= 0) {
      throw new ReconciliationSftpError(`Remote file already exists: ${remotePath}`)
    }

    await client.uploadFrom(Readable.from([Buffer.from(input.content, "utf8")]), remotePath)
  })
}

const withFtpClient = async (
  input: { config: ReconciliationConfig },
  callback: (client: FtpClient) => Promise<void>
) => {
  const client = new FtpClient()

  try {
    const connection = await getConnection(input)
    await client.access({
      host: connection.host,
      password: connection.password,
      port: connection.port,
      secure: false,
      user: connection.username,
    })
    await callback(client)
  } catch (error) {
    if (error instanceof ReconciliationSftpError) {
      throw error
    }

    throw new ReconciliationSftpError(
      error instanceof Error ? error.message : "FTP operation failed"
    )
  } finally {
    client.close()
  }
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
    throw new ReconciliationSftpError("Delivery host, username, and password secret are required")
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
    throw new ReconciliationSftpError("Delivery password secret was not found in Vault")
  }

  return secret
}

const getRemotePath = (config: ReconciliationConfig, filename: string) => {
  if (!config.sftpRemotePath) {
    throw new ReconciliationSftpError("Delivery remote path is required")
  }

  return `${config.sftpRemotePath.replace(/\/+$/, "")}/${filename}`
}
