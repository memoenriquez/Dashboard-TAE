import { notFound } from "next/navigation"

import { AdminSetupGuide } from "@/components/admin/setup-guide"
import { resolveCurrentDashboardUiAccess } from "@/features/auth/profile"
import { requireCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDashboardMetadataRepository } from "@/lib/supabase/metadata-repository"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireCurrentUser()
  const metadataRepository = createDashboardMetadataRepository(createAdminClient())
  const { isInternalAdmin } = await resolveCurrentDashboardUiAccess({
    userId: user.id,
    repository: metadataRepository,
  })

  if (!isInternalAdmin) {
    // Hide admin UI routes from authenticated non-admin users.
    notFound()
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Configuración del dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Administración
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Da de alta clientes, invita usuarios y organiza grupos de consulta.
          </p>
        </div>
      </div>
      <AdminSetupGuide />
      {children}
    </main>
  )
}
