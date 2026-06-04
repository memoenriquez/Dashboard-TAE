import { TransactionDashboard } from "@/components/dashboard/transaction-dashboard"
import { resolveCurrentProfile } from "@/features/auth/profile"
import { listAvailableTransactionClients } from "@/features/clients/scope"
import { requireCurrentUser } from "@/lib/auth/session"
import { createDashboardMetadataRepository } from "@/lib/supabase/metadata-repository"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10)

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const metadataRepository = createDashboardMetadataRepository(await createClient())
  const resolvedProfile = await resolveCurrentProfile({
    userId: user.id,
    repository: metadataRepository,
  })
  const availableClients = await listAvailableTransactionClients({
    client: resolvedProfile.client,
    isInternalAdmin: resolvedProfile.profile.isInternalAdmin,
    repository: metadataRepository,
  })
  const currentClient = resolvedProfile.client ?? (
    resolvedProfile.profile.isInternalAdmin
      ? {
          id: resolvedProfile.profile.id,
          externalClientId: null,
          displayName: resolvedProfile.profile.displayName || "Administrador",
          clientKind: "admin" as const,
        }
      : null
  )
  const today = new Date()
  const initialFilters = {
    from: toDateInputValue(new Date(today.getTime() - 7 * 86_400_000)),
    to: toDateInputValue(today),
    status: "all",
    phoneNumber: "",
    reference: "",
    externalClientId: "all",
  }

  return (
    <TransactionDashboard
      availableClients={availableClients}
      currentClient={currentClient}
      initialFilters={initialFilters}
    />
  )
}
