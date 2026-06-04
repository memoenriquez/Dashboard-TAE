import { getTransactionDetail } from "@/features/transactions/transaction-service"
import { createSqlServerTransactionRepository } from "@/lib/external-db/transactions-repository"

import {
  recordTrustedAuditEvent,
  resolveTransactionRequestContext,
} from "../../_lib/dashboard-context"
import { withApiErrorHandling } from "../../_lib/api-route"

export const dynamic = "force-dynamic"

interface TransactionDetailRouteContext {
  params: Promise<{
    ticket: string
  }>
}

export const GET = withApiErrorHandling(
  async (_request: Request, context: TransactionDetailRouteContext) => {
    const { ticket } = await context.params
    const dashboardContext = await resolveTransactionRequestContext()
    const transaction = await getTransactionDetail({
      repository: createSqlServerTransactionRepository(),
      scope: dashboardContext.scope,
      ticket,
    })

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 })
    }

    try {
      await recordTrustedAuditEvent({
        actorUserId: dashboardContext.user.id,
        actorClientId: dashboardContext.resolvedProfile.profile.clientId,
        eventType: "transaction_detail_viewed",
        targetType: "transaction",
        targetId: ticket,
        metadata: {
          externalClientId: transaction.externalClientId,
        },
      })
    } catch {
      // Transaction access has already been authorized; audit outages are non-blocking.
    }

    return Response.json({ transaction })
  }
)
