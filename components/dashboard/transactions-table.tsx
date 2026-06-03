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
  openingTicket: string | null
  rows: DashboardTransaction[]
  showClientColumn: boolean
  onCloseDetail: () => void
  onOpenDetail: (transaction: DashboardTransaction) => void
}

export function TransactionsTable({
  detail,
  openingTicket,
  rows,
  showClientColumn,
  onCloseDetail,
  onOpenDetail,
}: TransactionsTableProps) {
  const detailColSpan = showClientColumn ? 6 : 5

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[820px] table-fixed">
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
            <TableHead className="px-4">Fecha</TableHead>
            <TableHead className="px-4">Estado</TableHead>
            <TableHead className="px-4">Teléfono</TableHead>
            {showClientColumn ? <TableHead className="px-4">Cliente</TableHead> : null}
            <TableHead className="px-4 text-right">Monto</TableHead>
            <TableHead className="px-4 text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = detail?.ticket === row.ticket

            return (
              <Fragment key={row.ticket}>
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="px-4 text-sm tabular-nums">
                    {new Date(row.occurredAt).toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge variant={row.status === "successful" ? "secondary" : "destructive"}>
                      {row.status === "successful" ? "Exitosa" : "Fallida"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 tabular-nums">{row.phoneNumber}</TableCell>
                  {showClientColumn ? (
                    <TableCell className="truncate px-4 text-sm">
                      {row.visibleClientName}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-4 text-right font-medium tabular-nums">
                    {row.soldAmount.toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    })}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={openingTicket !== null}
                      onClick={() => {
                        if (isExpanded) {
                          onCloseDetail()
                          return
                        }

                        onOpenDetail(row)
                      }}
                    >
                      {getDetailButtonLabel({
                        isExpanded,
                        isOpening: openingTicket === row.ticket,
                      })}
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded ? (
                  <TableRow className="bg-muted/20">
                    <TableCell className="min-w-[560px] p-3" colSpan={detailColSpan}>
                      <TransactionDetail transaction={detail} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

const getDetailButtonLabel = ({
  isExpanded,
  isOpening,
}: {
  isExpanded: boolean
  isOpening: boolean
}) => {
  if (isOpening) {
    return "Abriendo..."
  }

  if (isExpanded) {
    return "Ocultar"
  }

  return "Ver"
}
