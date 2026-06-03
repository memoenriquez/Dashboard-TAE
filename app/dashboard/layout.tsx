import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { resolveCurrentDashboardUiAccess } from "@/features/auth/profile"
import { requireCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDashboardMetadataRepository } from "@/lib/supabase/metadata-repository"

export default async function DashboardLayout({
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

  return (
    <SidebarProvider>
      <DashboardNav showAdmin={isInternalAdmin} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              Transacciones de recarga
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Consulta, filtra y exporta reportes.
            </span>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
