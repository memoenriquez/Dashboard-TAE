import { ProfileForm } from "@/components/admin/profile-form"
import { AdminSetupGuide } from "@/components/admin/setup-guide"

export const dynamic = "force-dynamic"

export default function AdminUsersPage() {
  return (
    <>
      <AdminSetupGuide />
      <ProfileForm />
    </>
  )
}
