"use client"

import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { readApiErrorMessage } from "@/lib/api/client-error"

import type { TransactionFilterState } from "./filter-bar"

interface ExportButtonProps {
  filters: TransactionFilterState
  disabled?: boolean
}

export function ExportButton({ disabled = false, filters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleClick = async () => {
    if (disabled || isExporting) {
      return
    }

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      }
    })
    setIsExporting(true)
    const toastId = toast.loading("Generando exportación CSV...")

    try {
      const response = await fetch(`/api/transactions/export?${params.toString()}`)

      if (!response.ok) {
        toast.error(
          await readApiErrorMessage(response, "No fue posible exportar transacciones."),
          { id: toastId }
        )
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = getExportFilename(response) ?? "transacciones.csv"
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success("Exportación CSV generada.", { id: toastId })
    } catch {
      toast.error("No fue posible exportar transacciones en este momento.", {
        id: toastId,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || isExporting}
      onClick={handleClick}
    >
      <DownloadIcon data-icon="inline-start" />
      {isExporting ? "Exportando..." : "Exportar CSV"}
    </Button>
  )
}

const getExportFilename = (response: Response) => {
  const contentDisposition = response.headers.get("content-disposition")
  const match = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i)
  return match?.[1]
}
