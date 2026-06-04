import { recordAuditEvent } from "@/features/audit/audit-service"
import { getTransactionDetail } from "@/features/transactions/transaction-service"
import { createSqlServerTransactionRepository } from "@/lib/external-db/transactions-repository"

import { resolveTransactionRequestContext } from "../../_lib/dashboard-context"
import { withApiErrorHandling } from "../../_lib/route"

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
  }
)
