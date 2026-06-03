import { listExternalClients } from "@/lib/external-db/external-clients-repository"

import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"
import { parsePositiveInteger } from "../../_lib/transaction-params"

export const dynamic = "force-dynamic"

export const GET = async (request: Request) => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

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
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
