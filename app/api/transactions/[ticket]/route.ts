import { recordAuditEvent } from "@/features/audit/audit-service"
import { getTransactionDetail } from "@/features/transactions/transaction-service"
import { createSqlServerTransactionRepository } from "@/lib/external-db/transactions-repository"

import { resolveDashboardRequestContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

interface TransactionDetailRouteContext {
  params: Promise<{
    ticket: string
  }>
}

export const GET = async (
  _request: Request,
  context: TransactionDetailRouteContext
) => {
  try {
    const { ticket } = await context.params
    const dashboardContext = await resolveDashboardRequestContext()
    const transaction = await getTransactionDetail({
      repository: createSqlServerTransactionRepository(),
      scope: dashboardContext.scope,
      ticket,
    })

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 })
    }

    await recordAuditEvent({
      repository: dashboardContext.metadataRepository,
      event: {
        actorUserId: dashboardContext.user.id,
        actorClientId: dashboardContext.resolvedProfile.profile.clientId,
        eventType: "transaction_detail_viewed",
        targetType: "transaction",
        targetId: ticket,
        metadata: {
          externalClientId: transaction.externalClientId,
        },
      },
    })

    return Response.json({ transaction })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
