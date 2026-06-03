import { CircleDollarSignIcon, ReceiptTextIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface KpiCardsProps {
  transactionCount: number
  soldAmount: number
}

export function KpiCards({ transactionCount, soldAmount }: KpiCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Número de transacciones</CardTitle>
          <CardDescription>Exitosas y fallidas del periodo seleccionado.</CardDescription>
          <CardAction>
            <ReceiptTextIcon data-icon="inline-start" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {transactionCount.toLocaleString("es-MX")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Incluye los resultados que coinciden con tus filtros.
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Monto vendido</CardTitle>
          <CardDescription>Suma monetaria vendida confirmada.</CardDescription>
          <CardAction>
            <CircleDollarSignIcon data-icon="inline-start" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {soldAmount.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Suma solo transacciones exitosas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
