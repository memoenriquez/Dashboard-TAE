import { requireInternalAdminContext } from "../../_lib/dashboard-context"
import { toApiErrorResponse } from "../../_lib/errors"

export const dynamic = "force-dynamic"

export const GET = async () => {
  try {
    const { context, response } = await requireInternalAdminContext()

    if (response) {
      return response
    }

    return Response.json({ setupStatus: await context.metadataRepository.getSetupStatus() })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
