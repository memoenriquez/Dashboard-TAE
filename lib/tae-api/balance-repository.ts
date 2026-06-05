import "server-only"

import type { AccountBalanceRepository } from "@/features/accounts/balance-service"

import { createTaeApiClient } from "./client"
import type { TaeApiClient } from "./types"

interface CreateTaeApiBalanceRepositoryInput {
  client?: TaeApiClient
}

export const createTaeApiBalanceRepository = (
  input: CreateTaeApiBalanceRepositoryInput = {}
): AccountBalanceRepository => {
  const client = input.client ?? createTaeApiClient()

  return {
    getAccountBalance: async ({ externalClientId }) => {
      const balance = await client.getBalanceAccount({ cuentaID: externalClientId })

      return {
        externalClientId: balance.cuentaID,
        balance: balance.balance,
        updatedAt: balance.ultimaAct,
      }
    },
  }
}
