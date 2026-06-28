import { testReconciliationSftp } from "@/features/reconciliation/sftp-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"

import { assertInternalAdminContext } from "../../../_lib/dashboard-context"
import { DashboardValidationError } from "../../../_lib/errors"
import { readJsonObject } from "../../../_lib/request-body"
import { withApiErrorHandling } from "../../../_lib/api-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withApiErrorHandling(async (request: Request) => {
  await assertInternalAdminContext()
  const body = await readJsonObject(request)
  const ownerClientId = typeof body.ownerClientId === "string" ? body.ownerClientId.trim() : ""

  if (!ownerClientId) {
    throw new DashboardValidationError("Missing owner client")
  }

  const adminClient = createAdminClient()
  const config = await createReconciliationRepository(adminClient).getConfigByOwnerClientId(
    ownerClientId
  )

  if (!config) {
    throw new DashboardValidationError("Reconciliation config not found")
  }

  await testReconciliationSftp({ config })

  return Response.json({ ok: true })
})
