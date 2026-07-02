import { ClientForm } from "@/components/admin/client-form"
import { AdminSetupGuide } from "@/components/admin/setup-guide"

export const dynamic = "force-dynamic"

export default function AdminClientsPage() {
  return (
    <>
      <AdminSetupGuide />
      <ClientForm />
    </>
  )
}
