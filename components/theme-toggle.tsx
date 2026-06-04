"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { SidebarMenuButton } from "@/components/ui/sidebar"

const subscribe = () => {
  return () => {}
}

const useIsClient = () => {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const isClient = useIsClient()

  if (!isClient) {
    return <SidebarMenuButton aria-hidden="true" disabled />
  }

  const isDark = resolvedTheme === "dark"
  const nextTheme = isDark ? "light" : "dark"
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"

  const handleToggleTheme = () => {
    setTheme(nextTheme)
  }

  return (
    <SidebarMenuButton
      tooltip={label}
      render={
        <button type="button" aria-label={label} onClick={handleToggleTheme}>
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span>{isDark ? "Claro" : "Oscuro"}</span>
        </button>
      }
    />
  )
}
