"use client"

import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname()
  const isDashboardRoute = pathname.startsWith("/dashboard")

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      key={isDashboardRoute ? "dashboard-theme" : "public-theme"}
      storageKey={isDashboardRoute ? "theme" : "public-theme"}
    >
      <TooltipProvider>
        {children}
        <Toaster richColors />
      </TooltipProvider>
    </ThemeProvider>
  )
}
