import { CircleDollarSignIcon, ReceiptTextIcon, WalletIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { AccountBalanceResponse } from "./types"

interface KpiCardsProps {
  transactionCount: number
  soldAmount: number
  accountBalance: AccountBalanceResponse | null
  accountBalanceStatus: "error" | "loading" | "ready" | "requires-selection"
  accountBalanceMessage?: string
}

export function KpiCards({
  transactionCount,
  soldAmount,
  accountBalance,
  accountBalanceStatus,
  accountBalanceMessage,
}: KpiCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
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
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Saldo actual</CardTitle>
          <CardDescription>Disponible en la cuenta seleccionada.</CardDescription>
          <CardAction>
            <WalletIcon data-icon="inline-start" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {accountBalanceStatus === "ready" && accountBalance ? (
            <>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {accountBalance.balance.toLocaleString("es-MX", {
                  style: "currency",
                  currency: "MXN",
                })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                CuentaID {accountBalance.externalClientId}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                {getAccountBalanceFallbackLabel(accountBalanceStatus)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {accountBalanceMessage ?? getAccountBalanceFallbackMessage(accountBalanceStatus)}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const getAccountBalanceFallbackLabel = (
  status: KpiCardsProps["accountBalanceStatus"]
) => {
  if (status === "loading") {
    return "Consultando saldo..."
  }

  if (status === "error") {
    return "Saldo no disponible"
  }

  return "Selecciona una cuenta"
}

const getAccountBalanceFallbackMessage = (
  status: KpiCardsProps["accountBalanceStatus"]
) => {
  if (status === "loading") {
    return "La consulta no depende del rango de fechas."
  }

  if (status === "error") {
    return "Intenta consultar nuevamente."
  }

  return "El saldo no se suma en vistas consolidadas."
}
