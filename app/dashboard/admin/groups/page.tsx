import { GroupForm } from "@/components/admin/group-form"
import { AdminSetupGuide } from "@/components/admin/setup-guide"

export const dynamic = "force-dynamic"

export default function AdminGroupsPage() {
  return (
    <>
      <AdminSetupGuide />
      <GroupForm />
    </>
  )
}
