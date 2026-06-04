import { listExternalClients } from "@/lib/external-db/external-clients-repository"

import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { withApiErrorHandling } from "../../_lib/api-route"
import { parsePositiveInteger } from "../../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async (request: Request) => {
    const context = await assertInternalAdminContext()

    const url = new URL(request.url)
    const page = parsePositiveInteger(url.searchParams, "page", 1, 10_000)
    const pageSize = parsePositiveInteger(url.searchParams, "pageSize", 25, 100)
    const search = url.searchParams.get("search")?.trim() || null
    const [externalClients, linkedClients] = await Promise.all([
      listExternalClients({ search, page, pageSize }),
      context.metadataRepository.listClients(),
    ])
    const linkedExternalClientIds = new Set(
      linkedClients.map((client) => client.externalClientId)
    )

    return Response.json({
      externalClients: externalClients.map((client) => ({
        ...client,
        isLinked: linkedExternalClientIds.has(client.externalClientId),
      })),
      pagination: {
        page,
        pageSize,
        hasMore: externalClients.length === pageSize,
      },
    })
})
