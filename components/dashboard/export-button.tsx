"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { TransactionFilterState } from "./filter-bar"

interface ExportButtonProps {
  filters: TransactionFilterState
  disabled?: boolean
}

export function ExportButton({ disabled = false, filters }: ExportButtonProps) {
  const handleClick = () => {
    if (disabled) {
      return
    }

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      }
    })
    window.location.href = `/api/transactions/export?${params.toString()}`
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleClick}
    >
      <DownloadIcon data-icon="inline-start" />
      Exportar CSV
    </Button>
  )
}
