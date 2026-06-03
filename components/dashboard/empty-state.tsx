import { InboxIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function TransactionsEmptyState() {
  return (
    <Empty className="rounded-2xl border bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>Sin transacciones</EmptyTitle>
        <EmptyDescription>
          No hay transacciones con estos filtros en el periodo seleccionado.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
