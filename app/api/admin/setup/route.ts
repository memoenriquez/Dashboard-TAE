import { assertInternalAdminContext } from "../../_lib/dashboard-context"
import { withApiErrorHandling } from "../../_lib/route"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async () => {
    const context = await assertInternalAdminContext()

    return Response.json({ setupStatus: await context.metadataRepository.getSetupStatus() })
})
