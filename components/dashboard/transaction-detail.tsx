import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getResponseCodeCatalogEntry } from "@/features/transactions/response-code-catalog"

import type { DashboardTransaction } from "./types"

interface TransactionDetailProps {
  transaction: DashboardTransaction | null
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  if (!transaction) {
    return null
  }

  const responseCodeCatalog = getResponseCodeCatalogEntry(transaction.responseCode)

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Detalle de transacción</CardTitle>
        <CardDescription className="font-mono text-xs">
          {transaction.ticket}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 pt-5 text-sm md:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Estado">
            <Badge variant={transaction.status === "successful" ? "secondary" : "destructive"}>
              {transaction.status === "successful" ? "Exitosa" : "Fallida"}
            </Badge>
          </DetailItem>
          <DetailItem label="Cliente">{transaction.visibleClientName}</DetailItem>
          <DetailItem label="ID de cliente">
            {transaction.externalClientId}
          </DetailItem>
          <DetailItem label="Teléfono">{transaction.phoneNumber}</DetailItem>
          <DetailItem label="Producto">
            {transaction.productName ?? transaction.sku}
          </DetailItem>
          <DetailItem label="Monto">
            {transaction.soldAmount.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </DetailItem>
          <DetailItem label="Código">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{transaction.responseCode}</span>
              <Badge variant={getCatalogBadgeVariant(responseCodeCatalog.severity)}>
                {responseCodeCatalog.label}
              </Badge>
            </div>
          </DetailItem>
          <DetailItem label="Referencia API">
            {transaction.apiReference ?? "No disponible"}
          </DetailItem>
          <DetailItem label="Autorización">
            {transaction.authorization ?? "No disponible"}
          </DetailItem>
          <DetailItem label="Respuesta de proveedor">
            {transaction.responseMessage ?? "No disponible"}
          </DetailItem>
          <DetailItem label="Contexto del código">
            {responseCodeCatalog.description}
          </DetailItem>
        </dl>
      </CardContent>
    </Card>
  )
}

function DetailItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{children}</dd>
    </div>
  )
}

const getCatalogBadgeVariant = (
  severity: ReturnType<typeof getResponseCodeCatalogEntry>["severity"]
) => {
  if (severity === "error") {
    return "destructive"
  }

  if (severity === "success") {
    return "secondary"
  }

  return "outline"
}
