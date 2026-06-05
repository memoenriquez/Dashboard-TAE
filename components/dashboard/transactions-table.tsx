import { Fragment } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TransactionDetail } from "./transaction-detail"
import type { DashboardTransaction } from "./types"

interface TransactionsTableProps {
  detail: DashboardTransaction | null
  rows: DashboardTransaction[]
  showClientColumn: boolean
  onCloseDetail: () => void
  onOpenDetail: (transaction: DashboardTransaction) => void
}

export function TransactionsTable({
  detail,
  rows,
  showClientColumn,
  onCloseDetail,
  onOpenDetail,
}: TransactionsTableProps) {
  const detailColSpan = showClientColumn ? 6 : 5

  return (
    <Table className="w-full table-fixed">
      <colgroup>
        <col className={showClientColumn ? "w-[22%]" : "w-[28%]"} />
        <col className={showClientColumn ? "w-[16%]" : "w-[18%]"} />
        <col className={showClientColumn ? "w-[18%]" : "w-[20%]"} />
        {showClientColumn ? <col className="w-[18%]" /> : null}
        <col className={showClientColumn ? "w-[14%]" : "w-[18%]"} />
        <col className={showClientColumn ? "w-[12%]" : "w-[16%]"} />
      </colgroup>
      <TableHeader>
        <TableRow className="bg-muted/30">
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Teléfono</TableHead>
          {showClientColumn ? <TableHead>Cliente</TableHead> : null}
          <TableHead>Monto</TableHead>
          <TableHead>Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isExpanded = detail?.ticket === row.ticket

          return (
            <Fragment key={row.ticket}>
              <TableRow className="hover:bg-muted/20">
                <TableCell className="max-w-0 truncate text-sm tabular-nums">
                  {new Date(row.occurredAt).toLocaleString("es-MX")}
                </TableCell>
                <TableCell>
                  <Badge variant={row.status === "successful" ? "secondary" : "destructive"}>
                    {row.status === "successful" ? "Exitosa" : "Fallida"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-0 truncate tabular-nums">
                  {row.phoneNumber}
                </TableCell>
                {showClientColumn ? (
                  <TableCell className="max-w-0 truncate text-sm">
                    {row.visibleClientName}
                  </TableCell>
                ) : null}
                <TableCell className="max-w-0 truncate font-medium tabular-nums">
                  {row.soldAmount.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isExpanded) {
                        onCloseDetail()
                        return
                      }

                      onOpenDetail(row)
                    }}
                  >
                    {getDetailButtonLabel(isExpanded)}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded ? (
                <TableRow className="bg-muted/20">
                  <TableCell className="p-3 text-left whitespace-normal" colSpan={detailColSpan}>
                    <TransactionDetail transaction={detail} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

const getDetailButtonLabel = (isExpanded: boolean) => {
  if (isExpanded) {
    return "Ocultar"
  }

  return "Ver"
}
