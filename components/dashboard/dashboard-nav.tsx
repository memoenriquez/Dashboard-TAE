"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ComponentType } from "react"
import { useState } from "react"
import {
  Building2Icon,
  LogOutIcon,
  NetworkIcon,
  RadioTowerIcon,
  ReceiptTextIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { getSupabaseAuthErrorMessage } from "@/lib/supabase/auth-error-message"
import { createClient } from "@/lib/supabase/client"

const operationItems = [
  { href: "/dashboard", label: "Transacciones", icon: ReceiptTextIcon },
]

const adminItems = [
  { href: "/dashboard/admin/clients", label: "Clientes", icon: Building2Icon },
  { href: "/dashboard/admin/users", label: "Usuarios", icon: UsersIcon },
  { href: "/dashboard/admin/groups", label: "Grupos", icon: NetworkIcon },
]

interface DashboardNavProps {
  showAdmin: boolean
}

export function DashboardNav({ showAdmin }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleLogOut = async () => {
    setIsSigningOut(true)
    const toastId = toast.loading("Cerrando sesión...")
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast.error(
          getSupabaseAuthErrorMessage(error, "No fue posible cerrar sesión."),
          { id: toastId }
        )
        setIsSigningOut(false)
        return
      }

      toast.dismiss(toastId)
      router.replace("/login")
      router.refresh()
    } catch {
      toast.error("No fue posible cerrar sesión en este momento.", {
        id: toastId,
      })
      setIsSigningOut(false)
    }
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 rounded-xl border bg-background p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:size-8">
            <RadioTowerIcon />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Dashboard TAE</span>
            <span className="truncate text-xs text-muted-foreground">
              Recargas Telcel
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Consulta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationItems.map((item) => (
                <NavItem
                  href={item.href}
                  icon={item.icon}
                  isActive={pathname === item.href}
                  key={item.href}
                  label={item.label}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin ? (
          <>
            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Administración</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <NavItem
                      href={item.href}
                      icon={item.icon}
                      isActive={pathname.startsWith(item.href)}
                      key={item.href}
                      label={item.label}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled={isSigningOut}
              tooltip="Cerrar sesión"
              render={
                <button type="button" onClick={handleLogOut}>
                  <LogOutIcon />
                  <span>{isSigningOut ? "Saliendo..." : "Cerrar sesión"}</span>
                </button>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Revisa transacciones y exporta reportes cuando lo necesites.
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

interface NavItemProps {
  href: string
  icon: ComponentType
  isActive: boolean
  label: string
}

const NavItem = ({ href, icon: Icon, isActive, label }: NavItemProps) => (
  <SidebarMenuItem>
    <SidebarMenuButton
      isActive={isActive}
      tooltip={label}
      render={
        <Link href={href} aria-current={isActive ? "page" : undefined}>
          <Icon />
          <span>{label}</span>
        </Link>
      }
    />
  </SidebarMenuItem>
)
