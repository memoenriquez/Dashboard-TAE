"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminSetupStatus } from "@/features/clients/types"
import { readApiErrorMessage } from "@/lib/api/client-error"

interface SetupStep {
  label: string
  description: string
  href: string
  actionLabel: string
  isComplete: boolean
}

export function AdminSetupGuide() {
  const [setupStatus, setSetupStatus] = useState<AdminSetupStatus | null>(null)

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const response = await fetch("/api/admin/setup")

        if (!response.ok) {
          toast.error(
            await readApiErrorMessage(
              response,
              "No fue posible cargar el estado de configuración."
            )
          )
          return
        }

        const payload = (await response.json()) as { setupStatus: AdminSetupStatus }
        setSetupStatus(payload.setupStatus)
      } catch {
        toast.error("No fue posible cargar el estado de configuración.")
      }
    })
  }, [])

  if (!setupStatus) {
    return null
  }

  const steps: SetupStep[] = [
    {
      label: "1. Crear clientes",
      description:
        "Registra al menos un cliente principal y un asociado con cuentaID. El principal puede ser solo contenedor.",
      href: "/dashboard/admin/clients",
      actionLabel: "Ir a Clientes",
      isComplete: setupStatus.hasParentClient && setupStatus.hasChildClient,
    },
    {
      label: "2. Crear grupo",
      description:
        "Vincula el cliente principal con sus asociados para definir qué transacciones podrá consultar.",
      href: "/dashboard/admin/groups",
      actionLabel: "Ir a Grupos",
      isComplete: setupStatus.hasGroup,
    },
    {
      label: "3. Invitar usuario",
      description:
        "Asigna un usuario al cliente principal, asociado o independiente que debe consultar el portal.",
      href: "/dashboard/admin/users",
      actionLabel: "Ir a Usuarios",
      isComplete: setupStatus.hasClientUser,
    },
    {
      label: "4. Revisar dashboard",
      description:
        "Valida que el usuario vea el nombre de cuenta correcto y pueda filtrar por clientes disponibles.",
      href: "/dashboard",
      actionLabel: "Ir al Dashboard",
      isComplete: setupStatus.isComplete,
    },
  ]

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Guía de configuración</CardTitle>
          <Badge variant={setupStatus.isComplete ? "secondary" : "outline"}>
            {setupStatus.isComplete ? "Configuración completa" : "Configuración pendiente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">{step.label}</span>
                <p className="text-sm leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <Badge variant={step.isComplete ? "secondary" : "outline"}>
                {step.isComplete ? "Listo" : "Pendiente"}
              </Badge>
            </div>
            <Button
              nativeButton={false}
              size="sm"
              variant={step.isComplete ? "outline" : "default"}
              render={<Link href={step.href}>{step.actionLabel}</Link>}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
