import { createReconciliationRepository } from "@/lib/supabase/reconciliation-repository"
import { createAdminClient } from "@/lib/supabase/admin"

import { resolveDashboardMetadataContext } from "../_lib/dashboard-context"
import { withApiErrorHandling } from "../_lib/api-route"

export const dynamic = "force-dynamic"

export const GET = withApiErrorHandling(async () => {
    const context = await resolveDashboardMetadataContext()
    const reconciliationRepository = createReconciliationRepository(createAdminClient())
    const profile = context.resolvedProfile.profile

    if (profile.isInternalAdmin) {
      const [clients, configs, runs] = await Promise.all([
        context.metadataRepository.listClients(),
        reconciliationRepository.listConfigs(),
        reconciliationRepository.listRuns(),
      ])

      return Response.json({ clients, configs, runs, isInternalAdmin: true })
    }

    const client = context.resolvedProfile.client
    if (!client || client.clientKind === "child") {
      return Response.json({ clients: [], configs: [], runs: [] })
    }

    const [config, runs] = await Promise.all([
      reconciliationRepository.getConfigByOwnerClientId(client.id),
      reconciliationRepository.listRunsByOwnerClientId(client.id),
    ])

    return Response.json({
      clients: [client],
      configs: config ? [maskClientConfig(config)] : [],
      runs: runs.map(maskClientRun),
      isInternalAdmin: false,
    })
})

const maskClientConfig = <TConfig extends {
  sftpHost: string | null
  sftpUsername: string | null
  sftpRemotePath: string | null
  sftpPasswordSecretName: string | null
}>(
  config: TConfig
): TConfig => ({
  ...config,
  sftpHost: config.sftpHost ? "configured" : null,
  sftpUsername: config.sftpUsername ? "configured" : null,
  sftpRemotePath: config.sftpRemotePath ? "configured" : null,
  sftpPasswordSecretName: config.sftpPasswordSecretName ? "configured" : null,
})

const maskClientRun = <TRun extends {
  id: string
  ownerClientId: string
  reconciledDate: string
  filename: string | null
  status: string
  transactionCount: number
  totalAmount: number
  fileDeletedAt: string | null
}>(run: TRun) => ({
  id: run.id,
  ownerClientId: run.ownerClientId,
  reconciledDate: run.reconciledDate,
  filename: run.filename,
  status: run.status,
  transactionCount: run.transactionCount,
  totalAmount: run.totalAmount,
  fileDeletedAt: run.fileDeletedAt,
  lastSendError: null,
  internalError: null,
})
