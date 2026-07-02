import type { AccountBalanceRepository } from "@/features/accounts/balance-service"
import type { Client } from "@/features/clients/types"

import { getBusinessDate, OPENING_BALANCE_TIME_ZONE } from "./date"
import type { OpeningBalanceSnapshot, OpeningBalanceSnapshotInput } from "./types"

export interface OpeningBalanceSnapshotRepository {
  getSnapshot: (input: {
    externalClientId: number
    businessDate: string
  }) => Promise<OpeningBalanceSnapshot | null>
  createSnapshot: (input: OpeningBalanceSnapshotInput) => Promise<OpeningBalanceSnapshot>
}

export const getOpeningBalanceSnapshot = (input: {
  repository: OpeningBalanceSnapshotRepository
  externalClientId: number
  businessDate?: string
}) =>
  input.repository.getSnapshot({
    externalClientId: input.externalClientId,
    businessDate: input.businessDate ?? getBusinessDate(),
  })

export const captureOpeningBalances = async (input: {
  clients: Client[]
  balanceRepository: AccountBalanceRepository
  snapshotRepository: OpeningBalanceSnapshotRepository
  now?: Date
  timeZone?: string
}) => {
  const capturedAt = (input.now ?? new Date()).toISOString()
  const timeZone = input.timeZone ?? OPENING_BALANCE_TIME_ZONE
  const businessDate = getBusinessDate({ now: input.now, timeZone })
  const clients = input.clients.filter(
    (client) => client.externalClientId !== null
  ) as Array<Client & { externalClientId: number }>
  const results = []

  for (const client of clients) {
    let step = "read_existing_snapshot"

    try {
      const existing = await input.snapshotRepository.getSnapshot({
        externalClientId: client.externalClientId,
        businessDate,
      })

      if (existing) {
        results.push({ externalClientId: client.externalClientId, status: "reused" })
        continue
      }

      step = "read_current_balance"
      const balance = await input.balanceRepository.getAccountBalance({
        externalClientId: client.externalClientId,
      })

      step = "create_snapshot"
      await input.snapshotRepository.createSnapshot({
        externalClientId: client.externalClientId,
        businessDate,
        timeZone,
        openingBalance: balance.balance,
        sourceUpdatedAt: balance.updatedAt,
        capturedAt,
      })
      results.push({ externalClientId: client.externalClientId, status: "created" })
    } catch (error) {
      results.push({
        externalClientId: client.externalClientId,
        status: "failed",
        step,
        error: error instanceof Error ? error.message : "Unexpected error",
      })
    }
  }

  return { businessDate, timeZone, results }
}
