"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CircleDollarSignIcon,
  ClockIcon,
  GaugeIcon,
  CalendarDaysIcon,
  PercentIcon,
  ReceiptTextIcon,
  TrophyIcon,
  WalletCardsIcon,
} from "lucide-react"
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid as RechartsCartesianGrid,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { readApiErrorMessage } from "@/lib/api/client-error"

import { shouldShowClientFilter } from "./balance-query"
import { FilterBar, type TransactionFilterState } from "./filter-bar"
import {
  toClientRankingChartData,
  toDailySalesChartData,
  toHourlySalesChartData,
  type SalesChartDatum,
} from "./metrics-chart-data"
import { buildMetricsQueryUrl, shouldShowClientRanking } from "./metrics-query"
import { SourceError } from "./source-error"
import type {
  DashboardClientContext,
  DashboardClientMetric,
  DashboardClientOption,
  DashboardDailySalesTrendPoint,
  DashboardHourlySalesTrendPoint,
  DashboardMetricKpis,
  DashboardSalesConcentration,
  MetricsResponse,
} from "./types"

interface MetricsDashboardProps {
  availableClients: DashboardClientOption[]
  currentClient: DashboardClientContext | null
  initialFilters: TransactionFilterState
}

export function MetricsDashboard({
  availableClients,
  currentClient,
  initialFilters,
}: MetricsDashboardProps) {
  const [filters, setFilters] = useState<TransactionFilterState>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<TransactionFilterState>(initialFilters)
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasPendingFilters =
    JSON.stringify(filters) !== JSON.stringify(appliedFilters)
  const showClientFilter = shouldShowClientFilter(availableClients, currentClient)
  const showRanking =
    shouldShowClientRanking(availableClients) && (data?.clientRanking.length ?? 0) > 1

  const loadMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildMetricsQueryUrl(appliedFilters))

      if (!response.ok) {
        setError(await readApiErrorMessage(response, "No fue posible consultar métricas."))
        return
      }

      setData((await response.json()) as MetricsResponse)
    } catch {
      setError("No fue posible consultar métricas en este momento.")
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    queueMicrotask(() => {
      void loadMetrics()
    })
  }, [loadMetrics])

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <Badge variant="outline" className="w-fit border-primary/20">
              Métricas
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Resumen ejecutivo
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Revisa ventas, volumen y desempeño del periodo para una cuenta o
                vista consolidada.
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
              <p className="font-medium text-foreground">Rendimiento</p>
              <p>Venta, volumen y ticket promedio</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Clientes</p>
              <p>Ranking disponible en vistas consolidadas</p>
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
            <span>Presiona Consultar para actualizar las métricas.</span>
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
          <MetricKpiCards
            kpis={data?.kpis ?? emptyMetricKpis}
            peakSalesDate={data?.peakSalesDate}
            peakSalesHour={data?.peakSalesHour}
            salesConcentration={data?.salesConcentration ?? emptySalesConcentration}
            topClient={data?.topClient}
          />
          <TrendSummaryGrid
            dailySales={data?.dailySales ?? []}
            hourlySales={data?.hourlySales ?? []}
          />
          {showRanking ? (
            <ClientRankingChart rows={data?.clientRanking ?? []} />
          ) : null}
          {showRanking ? <ClientRankingCard rows={data?.clientRanking ?? []} /> : null}
        </>
      )}
    </main>
  )
}

const MetricKpiCards = ({
  kpis,
  peakSalesDate,
  peakSalesHour,
  salesConcentration,
  topClient,
}: {
  kpis: DashboardMetricKpis
  peakSalesDate: DashboardDailySalesTrendPoint | null | undefined
  peakSalesHour: DashboardHourlySalesTrendPoint | null | undefined
  salesConcentration: DashboardSalesConcentration
  topClient: DashboardClientMetric | null | undefined
}) => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <MetricCard
      title="Monto vendido"
      description="Suma confirmada del periodo."
      value={formatCurrency(kpis.soldAmount)}
      helper="Solo transacciones exitosas."
      icon={CircleDollarSignIcon}
    />
    <MetricCard
      title="Transacciones"
      description="Exitosas y fallidas."
      value={kpis.transactionCount.toLocaleString("es-MX")}
      helper={`${kpis.successfulTransactionCount.toLocaleString("es-MX")} exitosas`}
      icon={ReceiptTextIcon}
    />
    <MetricCard
      title="Tasa de éxito"
      description="Exitosas sobre total."
      value={formatPercent(kpis.successRate)}
      helper={`${kpis.failedTransactionCount.toLocaleString("es-MX")} fallidas`}
      icon={PercentIcon}
    />
    <MetricCard
      title="Ticket promedio"
      description="Promedio vendido exitoso."
      value={formatCurrency(kpis.averageTicket)}
      helper="Monto vendido / exitosas."
      icon={WalletCardsIcon}
    />
    <MetricCard
      title="Cliente líder"
      description="Mayor venta acumulada."
      value={topClient ? formatCurrency(topClient.soldAmount) : "No disponible"}
      helper={topClient?.visibleClientName ?? "Sin ventas exitosas."}
      icon={TrophyIcon}
    />
    <MetricCard
      title="Día pico"
      description="Fecha con mayor venta."
      value={peakSalesDate ? formatCurrency(peakSalesDate.soldAmount) : "Sin ventas"}
      helper={peakSalesDate ? formatDateLabel(peakSalesDate.date) : "No hay ventas exitosas."}
      icon={CalendarDaysIcon}
    />
    <MetricCard
      title="Hora pico"
      description="Hora con mayor venta."
      value={peakSalesHour ? formatCurrency(peakSalesHour.soldAmount) : "Sin ventas"}
      helper={peakSalesHour ? `${formatHour(peakSalesHour.hour)} hrs` : "No hay ventas exitosas."}
      icon={ClockIcon}
    />
    <MetricCard
      title="Concentración top 3"
      description="Dependencia de venta."
      value={formatPercent(salesConcentration.topThreeClientsShare)}
      helper={`Top 1: ${formatPercent(salesConcentration.topClientShare)}`}
      icon={GaugeIcon}
    />
  </div>
)

const MetricCard = ({
  title,
  description,
  value,
  helper,
  icon: Icon,
}: {
  title: string
  description: string
  value: string
  helper: string
  icon: typeof CircleDollarSignIcon
}) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
      <CardAction>
        <Icon data-icon="inline-start" />
      </CardAction>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </CardContent>
  </Card>
)

const ClientRankingCard = ({ rows }: { rows: DashboardClientMetric[] }) => (
  <Card className="overflow-hidden shadow-sm">
    <CardHeader className="border-b bg-muted/20">
      <CardTitle>Ranking por cliente</CardTitle>
      <CardDescription>
        Ordenado por monto vendido y volumen de transacciones.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Venta</TableHead>
            <TableHead>Transacciones</TableHead>
            <TableHead>Tasa de éxito</TableHead>
            <TableHead>Ticket promedio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.externalClientId}>
              <TableCell>
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-medium text-foreground">
                    {row.visibleClientName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    CuentaID {row.externalClientId}
                  </span>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{formatCurrency(row.soldAmount)}</TableCell>
              <TableCell className="tabular-nums">
                {row.transactionCount.toLocaleString("es-MX")}
              </TableCell>
              <TableCell className="tabular-nums">{formatPercent(row.successRate)}</TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.averageTicket)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

const TrendSummaryGrid = ({
  dailySales,
  hourlySales,
}: {
  dailySales: DashboardDailySalesTrendPoint[]
  hourlySales: DashboardHourlySalesTrendPoint[]
}) => (
  <div className="grid gap-3 xl:grid-cols-2">
    <SalesLineChart
      data={toDailySalesChartData(dailySales)}
      description="Venta y promedio diario en orden cronológico."
      title="Tendencia por fecha"
    />
    <SalesBarChart
      data={toHourlySalesChartData(hourlySales)}
      description="Venta y promedio por hora del día."
      title="Tendencia por hora"
    />
  </div>
)

const SalesLineChart = ({
  data,
  description,
  title,
}: {
  data: SalesChartDatum[]
  description: string
  title: string
}) => (
  <Card className="overflow-hidden shadow-sm">
    <CardHeader className="border-b bg-muted/20">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-2 pt-4 sm:px-4">
      {data.length ? (
        <ChartContainer config={salesChartConfig} className="h-[280px] w-full">
          <RechartsLineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 12 }}
          >
            <RechartsCartesianGrid vertical={false} />
            <RechartsXAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <RechartsYAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCompactCurrency(Number(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {getChartLabel(salesChartConfig, name)}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </span>
                  )}
                />
              }
            />
            <RechartsLine
              dataKey="soldAmount"
              type="monotone"
              stroke="var(--color-soldAmount)"
              strokeWidth={2}
              dot={false}
            />
            <RechartsLine
              dataKey="averageSale"
              type="monotone"
              stroke="var(--color-averageSale)"
              strokeWidth={2}
              dot={false}
            />
          </RechartsLineChart>
        </ChartContainer>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No hay ventas exitosas para calcular tendencia.
        </p>
      )}
    </CardContent>
  </Card>
)

const SalesBarChart = ({
  data,
  description,
  title,
}: {
  data: SalesChartDatum[]
  description: string
  title: string
}) => (
  <Card className="overflow-hidden shadow-sm">
    <CardHeader className="border-b bg-muted/20">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-2 pt-4 sm:px-4">
      {data.length ? (
        <ChartContainer config={salesChartConfig} className="h-[280px] w-full">
          <RechartsBarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <RechartsCartesianGrid vertical={false} />
            <RechartsXAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <RechartsYAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCompactCurrency(Number(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {getChartLabel(salesChartConfig, name)}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </span>
                  )}
                />
              }
            />
            <RechartsBar
              dataKey="soldAmount"
              fill="var(--color-soldAmount)"
              radius={[6, 6, 0, 0]}
            />
          </RechartsBarChart>
        </ChartContainer>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No hay ventas exitosas para calcular tendencia.
        </p>
      )}
    </CardContent>
  </Card>
)

const ClientRankingChart = ({ rows }: { rows: DashboardClientMetric[] }) => {
  const chartData = toClientRankingChartData(rows)

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Venta por cliente</CardTitle>
        <CardDescription>
          Top 5 clientes por monto vendido en el periodo.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-4">
        {chartData.length ? (
          <ChartContainer config={clientChartConfig} className="h-[280px] w-full">
            <RechartsBarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 12, right: 12 }}
            >
              <RechartsCartesianGrid horizontal={false} />
              <RechartsXAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
              />
              <RechartsYAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {getChartLabel(clientChartConfig, name)}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <RechartsBar
                dataKey="soldAmount"
                fill="var(--color-soldAmount)"
                radius={[0, 6, 6, 0]}
              />
            </RechartsBarChart>
          </ChartContainer>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            No hay ventas exitosas para graficar clientes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const emptyMetricKpis: DashboardMetricKpis = {
  transactionCount: 0,
  successfulTransactionCount: 0,
  failedTransactionCount: 0,
  soldAmount: 0,
  successRate: 0,
  averageTicket: 0,
}

const emptySalesConcentration: DashboardSalesConcentration = {
  topClientShare: 0,
  topThreeClientsShare: 0,
}

const salesChartConfig = {
  soldAmount: {
    label: "Venta",
    color: "var(--chart-1)",
  },
  averageSale: {
    label: "Promedio",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const clientChartConfig = {
  soldAmount: {
    label: "Venta",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const getChartLabel = (config: ChartConfig, name: unknown) => {
  const key = String(name)

  return config[key]?.label ?? key
}

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  })

const formatPercent = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "percent",
    maximumFractionDigits: 1,
  })

const formatCompactCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  })

const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })

const formatHour = (hour: number) => String(hour).padStart(2, "0")
