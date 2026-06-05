import { DashboardValidationError } from "@/app/api/_lib/errors"
import type { TransactionScope } from "@/features/clients/scope"

export interface AccountBalance {
  externalClientId: number
  balance: number
  updatedAt: string
}

export interface AccountBalanceRepository {
  getAccountBalance: (input: { externalClientId: number }) => Promise<AccountBalance>
}

export const getAccountBalance = async (input: {
  repository: AccountBalanceRepository
  scope: TransactionScope
}): Promise<AccountBalance> => {
  if (input.scope.type !== "external_client_ids" || input.scope.externalClientIds.length !== 1) {
    throw new DashboardValidationError("Selecciona una cuenta para consultar saldo.")
  }

  return input.repository.getAccountBalance({
    externalClientId: input.scope.externalClientIds[0],
  })
}
