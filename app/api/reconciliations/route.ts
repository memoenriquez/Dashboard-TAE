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
      const [clients, configs, runs, childConfigs, groups] = await Promise.all([
        context.metadataRepository.listClients(),
        reconciliationRepository.listConfigs(),
        reconciliationRepository.listRuns(),
        reconciliationRepository.listChildConfigs(),
        context.metadataRepository.listGroupsWithMembers(),
      ])

      return Response.json({
        clients: attachParentClientIds(clients, groups),
        configs,
        childConfigs,
        runs,
        isInternalAdmin: true,
      })
    }

    const client = context.resolvedProfile.client
    if (!client || client.clientKind === "child") {
      return Response.json({ clients: [], configs: [], runs: [] })
    }

    const [config, runs, childClients] = await Promise.all([
      reconciliationRepository.getConfigByOwnerClientId(client.id),
      reconciliationRepository.listRunsByOwnerClientId(client.id),
      client.clientKind === "parent"
        ? context.metadataRepository.listChildClientsForParent(client.id)
        : Promise.resolve([]),
    ])
    const childConfigs = config
      ? await reconciliationRepository.listChildConfigsByConfigId(config.id)
      : []

    return Response.json({
      clients: [client, ...childClients.map((child) => ({ ...child, parentClientId: client.id }))],
      configs: config ? [maskClientConfig(config)] : [],
      childConfigs,
      runs: runs.map(maskClientRun),
      isInternalAdmin: false,
    })
})

const attachParentClientIds = <TClient extends { id: string }>(
  clients: TClient[],
  groups: { parentClientId: string; childClients: { id: string }[] }[]
) => {
  const parentByChildId = new Map<string, string>()
  groups.forEach((group) => {
    group.childClients.forEach((child) => parentByChildId.set(child.id, group.parentClientId))
  })

  return clients.map((client) => ({
    ...client,
    parentClientId: parentByChildId.get(client.id) ?? null,
  }))
}

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
  subjectClientId: string
  reconciledDate: string
  filename: string | null
  status: string
  transactionCount: number
  totalAmount: number
  fileDeletedAt: string | null
}>(run: TRun) => ({
  id: run.id,
  ownerClientId: run.ownerClientId,
  subjectClientId: run.subjectClientId,
  reconciledDate: run.reconciledDate,
  filename: run.filename,
  status: run.status,
  transactionCount: run.transactionCount,
  totalAmount: run.totalAmount,
  fileDeletedAt: run.fileDeletedAt,
  lastSendError: null,
  internalError: null,
})
