"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiErrorMessage } from "@/lib/api/client-error"

import {
  buildBalanceQueryUrl,
  getBalanceQueryExternalClientId,
  shouldShowClientFilter,
} from "./balance-query"
import { ExportButton } from "./export-button"
import { FilterBar, type TransactionFilterState } from "./filter-bar"
import { KpiCards } from "./kpi-cards"
import { SourceError } from "./source-error"
import { TransactionsEmptyState } from "./empty-state"
import { TransactionsTable } from "./transactions-table"
import type {
  AccountBalanceResponse,
  DashboardClientContext,
  DashboardClientOption,
  DashboardTransaction,
  TransactionsResponse,
} from "./types"

interface TransactionDashboardProps {
  availableClients: DashboardClientOption[]
  currentClient: DashboardClientContext | null
  initialFilters: TransactionFilterState
}

export function TransactionDashboard({
  availableClients,
  currentClient,
  initialFilters,
}: TransactionDashboardProps) {
  const [filters, setFilters] = useState<TransactionFilterState>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<TransactionFilterState>(initialFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [accountBalance, setAccountBalance] =
    useState<AccountBalanceResponse | null>(null)
  const [detail, setDetail] = useState<DashboardTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accountBalanceError, setAccountBalanceError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAccountBalanceLoading, setIsAccountBalanceLoading] = useState(false)
  const hasPendingFilters =
    JSON.stringify(filters) !== JSON.stringify(appliedFilters)
  const hasMultipleAvailableClients = availableClients.length > 1
  const showClientFilter = shouldShowClientFilter(availableClients, currentClient)
  const accountBalanceExternalClientId = getBalanceQueryExternalClientId(
    appliedFilters.externalClientId,
    availableClients,
    currentClient
  )

  const loadTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setDetail(null)

    const params = new URLSearchParams({
      from: appliedFilters.from,
      to: appliedFilters.to,
      status: appliedFilters.status,
      page: String(page),
      pageSize: "25",
    })

    if (appliedFilters.phoneNumber) {
      params.set("phoneNumber", appliedFilters.phoneNumber)
    }

    if (appliedFilters.reference) {
      params.set("reference", appliedFilters.reference)
    }

    if (appliedFilters.externalClientId !== "all") {
      params.set("externalClientId", appliedFilters.externalClientId)
    }

    try {
      const response = await fetch(`/api/transactions?${params.toString()}`)

      if (!response.ok) {
        setError(await readApiErrorMessage(response, "No fue posible consultar transacciones."))
        return
      }

      setData((await response.json()) as TransactionsResponse)
    } catch {
      setError("No fue posible consultar transacciones en este momento.")
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters, page])

  const loadAccountBalance = useCallback(async (signal?: AbortSignal) => {
    setAccountBalance(null)
    setAccountBalanceError(null)

    if (!accountBalanceExternalClientId) {
      setIsAccountBalanceLoading(false)
      return
    }

    setIsAccountBalanceLoading(true)

    try {
      const response = await fetch(buildBalanceQueryUrl(accountBalanceExternalClientId), {
        signal,
      })

      if (signal?.aborted) {
        return
      }

      if (!response.ok) {
        setAccountBalanceError(
          await readApiErrorMessage(response, "No fue posible consultar saldo.")
        )
        return
      }

      const balance = (await response.json()) as AccountBalanceResponse

      if (signal?.aborted) {
        return
      }

      setAccountBalance(balance)
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      setAccountBalanceError("No fue posible consultar saldo en este momento.")
    } finally {
      if (!signal?.aborted) {
        setIsAccountBalanceLoading(false)
      }
    }
  }, [accountBalanceExternalClientId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadTransactions()
    })
  }, [loadTransactions])

  useEffect(() => {
    const abortController = new AbortController()

    queueMicrotask(() => {
      if (!abortController.signal.aborted) {
        void loadAccountBalance(abortController.signal)
      }
    })

    return () => {
      abortController.abort()
    }
  }, [loadAccountBalance])

  const handleOpenDetail = (transaction: DashboardTransaction) => {
    setError(null)
    setDetail(transaction)
  }

  const handleApplyFilters = () => {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const totalPages = Math.max(
    1,
    Math.ceil((data?.pagination.totalRows ?? 0) / (data?.pagination.pageSize ?? 25))
  )

  const handlePreviousPage = () => {
    setPage((currentPage) => Math.max(1, currentPage - 1))
  }

  const handleNextPage = () => {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1))
  }
  const accountBalanceStatus = !accountBalanceExternalClientId
    ? "requires-selection"
    : isAccountBalanceLoading
      ? "loading"
      : accountBalanceError
        ? "error"
        : accountBalance
          ? "ready"
          : "loading"

  return (
    <main className="flex flex-col gap-5">
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <Badge variant="outline" className="w-fit border-primary/20">
              Transacciones
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Transacciones de recarga
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Filtra por fecha, estado, teléfono y cliente; abre el detalle y
                exporta tus resultados en CSV.
              </p>
            </div>
            {currentClient ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">
                  {currentClient.clientKind === "admin" ? "Vista:" : "Cuenta:"}{" "}
                  {currentClient.displayName}
                </span>
                {currentClient.clientKind === "admin" ? (
                  <Badge variant="outline">Vista administrativa de clientes</Badge>
                ) : currentClient.externalClientId === null ? (
                  <Badge variant="outline">Vista consolidada de clientes asociados</Badge>
                ) : (
                  <Badge variant="outline">CuentaID {currentClient.externalClientId}</Badge>
                )}
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2 lg:w-[360px]">
            <div>
              <p className="font-medium text-foreground">Resumen</p>
              <p>Totales y monto vendido</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Reportes</p>
              <p>Detalle y exportación CSV</p>
            </div>
          </div>
        </div>
      </div>

      <FilterBar
        availableClients={availableClients}
        filters={filters}
        showClientFilter={showClientFilter}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
      />

      {hasPendingFilters ? (
        <Alert className="sticky top-16 z-10 bg-card">
          <AlertTitle className="flex items-center gap-2">
            <Badge variant="outline">Filtros sin aplicar</Badge>
            Cambios pendientes
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Presiona Consultar para actualizar el resumen, la tabla y la
              exportación.
            </span>
            <Button type="button" size="sm" onClick={handleApplyFilters}>
              Aplicar ahora
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? <SourceError message={error} /> : null}

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          <KpiCards
            transactionCount={data?.kpis.transactionCount ?? 0}
            soldAmount={data?.kpis.soldAmount ?? 0}
            accountBalance={accountBalance}
            accountBalanceStatus={accountBalanceStatus}
            accountBalanceMessage={accountBalanceError ?? undefined}
          />

          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Página de resultados</CardTitle>
              <CardDescription>
                Página {data?.pagination.page ?? page} de {totalPages}. Ordenada
                por fecha/hora descendente.
              </CardDescription>
              <CardAction>
                <ExportButton
                  disabled={hasPendingFilters || isLoading}
                  filters={appliedFilters}
                />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {data?.rows.length ? (
                <TransactionsTable
                  detail={detail}
                  rows={data.rows}
                  showClientColumn={hasMultipleAvailableClients}
                  onCloseDetail={() => setDetail(null)}
                  onOpenDetail={handleOpenDetail}
                />
              ) : (
                <div className="p-6">
                  <TransactionsEmptyState />
                </div>
              )}

              {data && data.pagination.totalRows > data.pagination.pageSize ? (
                <Pagination className="border-t px-4 py-3">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || isLoading}
                        onClick={handlePreviousPage}
                      >
                        Anterior
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-sm text-muted-foreground">
                        {page} / {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || isLoading}
                        onClick={handleNextPage}
                      >
                        Siguiente
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </CardContent>
          </Card>

        </>
      )}
    </main>
  )
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError"
