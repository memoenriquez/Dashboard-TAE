import { recordAuditEvent } from "@/features/audit/audit-service"
import { applyExternalClientFilterToScope } from "@/features/clients/scope"
import { createTransactionsCsv } from "@/features/transactions/transaction-service"
import { createSqlServerTransactionRepository } from "@/lib/external-db/transactions-repository"

import { resolveTransactionRequestContext } from "../../_lib/dashboard-context"
import { withApiErrorHandling } from "../../_lib/route"
import { parseTransactionSearchParams } from "../../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async (request: Request) => {
    const url = new URL(request.url)
    const context = await resolveTransactionRequestContext()
    const filters = parseTransactionSearchParams(url.searchParams)
    const scope = applyExternalClientFilterToScope(
      context.scope,
      filters.externalClientId ?? null
    )
    const csv = await createTransactionsCsv({
      repository: createSqlServerTransactionRepository(),
      scope,
      filters,
    })

    await recordAuditEvent({
      repository: context.metadataRepository,
      event: {
        actorUserId: context.user.id,
        actorClientId: context.resolvedProfile.profile.clientId,
        eventType: "csv_exported",
        targetType: "transactions",
        targetId: null,
        metadata: {
          from: filters.from.toISOString(),
          to: filters.to.toISOString(),
          status: filters.status,
          externalClientId: filters.externalClientId ?? null,
        },
      },
    })

    return new Response(csv, {
      headers: {
        "content-disposition": "attachment; filename=transacciones.csv",
        "content-type": "text/csv; charset=utf-8",
      },
    })
})
