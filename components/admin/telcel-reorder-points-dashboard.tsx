"use client"

import { useCallback, useState } from "react"
import {
  AlertTriangleIcon,
  CircleHelpIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { readApiErrorMessage } from "@/lib/api/client-error"
import type { ReorderResult } from "@/features/telcel-reorder/reorder-service"

interface TelcelReorderPointsDashboardProps {
  initialFilters: ReorderFormState
}

interface ReorderFormState {
  dateFrom: string
  dateTo: string
  currentBalance: string
  maxLedgerBalance: string
  leadTimeHours: string
  roundingIncrement: string
  workingStartHour: string
  workingEndHour: string
  firstTopUpTime: string
  secondTopUpTime: string
}

export function TelcelReorderPointsDashboard({
  initialFilters,
}: TelcelReorderPointsDashboardProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [data, setData] = useState<ReorderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasPendingFilters = JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  const loadRecommendations = useCallback(async (filtersToApply: ReorderFormState) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/telcel-reorder-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: filtersToApply.dateFrom,
          dateTo: filtersToApply.dateTo,
          operatingDate: new Date().toISOString(),
          currentBalance: Number(filtersToApply.currentBalance),
          maxLedgerBalance: Number(filtersToApply.maxLedgerBalance),
          leadTimeHours: Number(filtersToApply.leadTimeHours),
          roundingIncrement: Number(filtersToApply.roundingIncrement),
          workingStartHour: Number(filtersToApply.workingStartHour),
          workingEndHour: Number(filtersToApply.workingEndHour),
          topUpTimes: [filtersToApply.firstTopUpTime, filtersToApply.secondTopUpTime],
        }),
      })

      if (!response.ok) {
        setError(
          await readApiErrorMessage(response, "No fue posible calcular puntos de reorden.")
        )
        return
      }

      setData((await response.json()) as ReorderResult)
    } catch {
      setError("No fue posible calcular puntos de reorden en este momento.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (key: keyof ReorderFormState, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  const recommendedScenario = data?.scenarios.find((scenario) => scenario.recommended)

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <Badge variant="outline" className="w-fit border-primary/20">
              Seguridad operacional
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Puntos de reorden Telcel
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Calcula cuánto saldo mantener en el saldo interno usando consumo histórico
              consolidado, con el menor balance expuesto posible.
            </p>
          </div>
          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2 lg:w-[380px]">
            <div>
              <p className="font-medium text-foreground">Objetivo</p>
              <p>Balance mínimo sin quedarte corto.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Riesgo</p>
              <p>Alertas si el escenario supera tu límite preferido.</p>
            </div>
          </div>
        </div>
      </div>

      <form
        className="rounded-2xl border bg-card p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          setAppliedFilters({ ...filters })
          void loadRecommendations({ ...filters })
        }}
      >
        <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NumberField label="Saldo interno actual" tooltip="Saldo real disponible internamente. Es manual porque el dashboard no tiene visibilidad de ese saldo." value={filters.currentBalance} onChange={(value) => handleChange("currentBalance", value)} />
          <NumberField label="Límite preferido" tooltip="Balance máximo que prefieres mantener expuesto. No invalida escenarios; solo genera advertencias si se supera." value={filters.maxLedgerBalance} onChange={(value) => handleChange("maxLedgerBalance", value)} />
          <NumberField label="Tiempo de espera (hrs)" tooltip="Tiempo estimado desde que pides saldo a Telcel hasta que queda disponible. Se convierte en colchón adicional." value={filters.leadTimeHours} onChange={(value) => handleChange("leadTimeHours", value)} />
          <NumberField label="Redondeo" tooltip="Incremento usado para redondear objetivos y recargas. Ejemplo: 100 redondea a centenas." value={filters.roundingIncrement} onChange={(value) => handleChange("roundingIncrement", value)} />
          <Field className="justify-end">
            <FieldLabel className="sr-only">Consultar</FieldLabel>
            <Button type="submit" className="w-full">
              Calcular
            </Button>
          </Field>
          <Field>
            <FieldLabel className="flex items-center gap-1">Desde <InfoTooltip text="Inicio de la ventana histórica usada para estimar consumo actual. No significa que todo ese consumo sucederá hoy." /></FieldLabel>
            <Input type="date" value={filters.dateFrom} onChange={(event) => handleChange("dateFrom", event.target.value)} />
          </Field>
          <Field>
            <FieldLabel className="flex items-center gap-1">Hasta <InfoTooltip text="Fin de la ventana histórica. El rango se usa para calcular p95, promedios y patrones de consumo." /></FieldLabel>
            <Input type="date" value={filters.dateTo} onChange={(event) => handleChange("dateTo", event.target.value)} />
          </Field>
          <NumberField label="Inicio laboral" tooltip="Primera hora del día en la que puedes solicitar recargas." value={filters.workingStartHour} onChange={(value) => handleChange("workingStartHour", value)} />
          <NumberField label="Fin laboral" tooltip="Última hora útil para solicitar recargas. Después de esta hora, el modelo evita asumir disponibilidad." value={filters.workingEndHour} onChange={(value) => handleChange("workingEndHour", value)} />
          <Field>
            <FieldLabel className="flex items-center gap-1">Recargas 2 veces al día <InfoTooltip text="Horarios usados para dividir el día cuando comparas una estrategia de dos recargas diarias." /></FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={filters.firstTopUpTime} onChange={(event) => handleChange("firstTopUpTime", event.target.value)} />
              <Input type="time" value={filters.secondTopUpTime} onChange={(event) => handleChange("secondTopUpTime", event.target.value)} />
            </div>
          </Field>
        </FieldGroup>
      </form>

      {hasPendingFilters ? (
        <Alert className="bg-card">
          <AlertTitle>Filtros sin aplicar</AlertTitle>
          <AlertDescription>Presiona Calcular para actualizar la recomendación.</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : data ? (
        <>
          <ActionRecommendation data={data} />
          <SummaryCards data={data} />
          {recommendedScenario?.capNote ? (
            <Alert className="bg-card">
              <AlertTriangleIcon />
              <AlertTitle>Límite preferido superado</AlertTitle>
              <AlertDescription>{formatCapNote(recommendedScenario.capNote)}</AlertDescription>
            </Alert>
          ) : null}
          <ScenarioCards scenarios={data.scenarios} />
          <div className="grid gap-3 xl:grid-cols-2">
          <DemandBars title="Promedio por hora del día" rows={data.hourlyDemand.map((row) => ({ label: `${String(row.hour).padStart(2, "0")}:00`, value: row.demand }))} />
          <DemandBars title="Promedio por día de semana" rows={data.dayOfWeekDemand.map((row) => ({ label: row.day, value: row.demand }))} />
          </div>
          <PeakHours rows={data.peakHoursByPeriod} />
          <TopConsumers rows={data.topConsumers} />
        </>
      ) : (
        <Alert className="bg-card">
          <AlertTitle>Configura los parámetros</AlertTitle>
          <AlertDescription>
            Captura el saldo interno, límite preferido y fechas. Después presiona Calcular.
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}

const NumberField = ({
  label,
  onChange,
  tooltip,
  value,
}: {
  label: string
  onChange: (value: string) => void
  tooltip?: string
  value: string
}) => (
  <Field>
    <FieldLabel className="flex items-center gap-1">
      {label}
      {tooltip ? <InfoTooltip text={tooltip} /> : null}
    </FieldLabel>
    <Input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
  </Field>
)

const ActionRecommendation = ({ data }: { data: ReorderResult }) => {
  const scenario = data.scenarios.find((row) => row.recommended) ?? data.scenarios[0]
  const runwayDays =
    data.aggregateStats.p95DailyDemand === 0
      ? null
      : data.currentStatus.currentBalance / data.aggregateStats.p95DailyDemand
  const needsTopUp = data.currentStatus.status === "below-recommended"
  const statusText =
    needsTopUp
      ? "Agregar saldo ahora"
      : data.currentStatus.status === "no-data"
        ? "Datos insuficientes"
        : "No agregar saldo"
  const nextCheck = needsTopUp
    ? getNextCheckLabel(scenario.frequency)
    : `Monitorear hasta ${formatCurrency(scenario.reorderPoint)}`

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardDescription>Recomendación operativa</CardDescription>
            <CardTitle className="text-3xl">{statusText}</CardTitle>
          </div>
          <Badge variant={scenario.exceedsCap ? "destructive" : "default"}>
            {scenario.exceedsCap ? "Revisar límite" : "Límite correcto"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-4">
        <ActionMetric label="Agregar ahora" tooltip="Cantidad que tendrías que agregar hoy: max(0, balance objetivo - saldo actual)." value={formatCurrency(scenario.immediateTopUpAmount)} helper={needsTopUp ? "Sube al balance objetivo." : "Tu saldo actual ya cubre el objetivo."} />
        <ActionMetric label="Balance objetivo" tooltip="Saldo recomendado para la estrategia seleccionada. En días normales usa cobertura + tiempo de espera; viernes/domingo puede incluir fin de semana." value={formatCurrency(scenario.targetBalance)} helper={needsTopUp ? `Rutina sugerida: ${formatFrequency(scenario.frequency)}.` : "Referencia para cuando baje el saldo interno."} />
        <ActionMetric label="Cobertura estimada" tooltip="Días aproximados que cubre tu saldo actual: saldo actual / p95 diario." value={runwayDays === null ? "Sin demanda" : `${runwayDays.toFixed(1)} días`} helper="Saldo actual / p95 diario." />
        <ActionMetric label="Siguiente revisión" tooltip="Qué vigilar después. Si estás arriba del objetivo, monitorea hasta llegar al punto de reorden." value={nextCheck} helper={needsTopUp && scenario.weekendCarryRequired ? "Incluye cobertura de fin de semana." : "No es una instrucción de recarga inmediata."} />
      </CardContent>
      {scenario.capNote ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">{formatCapNote(scenario.capNote)}</CardContent>
      ) : null}
    </Card>
  )
}

const ActionMetric = ({
  helper,
  label,
  tooltip,
  value,
}: {
  helper: string
  label: string
  tooltip: string
  value: string
}) => (
  <div className="rounded-xl border bg-card p-3">
    <p className="flex items-center gap-1 text-sm text-muted-foreground">
      {label}
      <InfoTooltip text={tooltip} />
    </p>
    <p className="text-2xl font-semibold tracking-tight">{value}</p>
    <p className="text-xs text-muted-foreground">{helper}</p>
  </div>
)

const SummaryCards = ({ data }: { data: ReorderResult }) => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <SummaryCard title="P95 diario" tooltip="Día alto normal: 95% de los días históricos consumieron esto o menos. Incluye días con cero consumo." value={formatCurrency(data.aggregateStats.p95DailyDemand)} helper={`${data.aggregateStats.sampleSize.toLocaleString("es-MX")} ventas, confianza ${formatConfidence(data.aggregateStats.confidence)}`} />
    <SummaryCard title="Balance actual" tooltip="Saldo manual que capturaste como disponible en el saldo interno." value={formatCurrency(data.currentStatus.currentBalance)} helper={data.currentStatus.status === "below-recommended" ? "Debajo del objetivo" : "Dentro del objetivo"} />
    <SummaryCard title="Objetivo recomendado" tooltip="Balance objetivo de la estrategia recomendada, después de considerar p95, tiempo de espera, límite y fin de semana si aplica." value={formatCurrency(data.currentStatus.recommendedTargetBalance)} helper={`Diferencia ${formatCurrency(data.currentStatus.difference)}`} />
    <SummaryCard title="Tendencia p95" tooltip="Cambio del p95 actual contra la ventana histórica anterior del mismo tamaño." value={formatPercent(data.trendComparison.changePercent)} helper={`Previo ${formatCurrency(data.trendComparison.previousP95)}`} />
  </div>
)

const SummaryCard = ({ title, value, helper, tooltip }: { title: string; value: string; helper: string; tooltip: string }) => (
  <Card>
    <CardHeader>
      <CardDescription className="flex items-center gap-1">{title}<InfoTooltip text={tooltip} /></CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">{helper}</CardContent>
  </Card>
)

const ScenarioCards = ({ scenarios }: { scenarios: ReorderResult["scenarios"] }) => {
  const { hiddenScenarios, visibleScenarios } = getScenarioPreview(scenarios)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparar estrategias</CardTitle>
        <CardDescription>
          Se muestra la recomendada y algunas alternativas útiles. El resto queda colapsado para no saturar la lectura.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {visibleScenarios.map((scenario) => (
          <ScenarioCard key={scenario.frequency} scenario={scenario} />
        ))}
      </CardContent>
      {hiddenScenarios.length > 0 ? (
        <CardContent className="pt-0">
          <details className="rounded-xl border bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Ver {hiddenScenarios.length} estrategias adicionales
            </summary>
            <div className="grid gap-3 pt-3 lg:grid-cols-2 xl:grid-cols-3">
              {hiddenScenarios.map((scenario) => (
                <ScenarioCard key={scenario.frequency} scenario={scenario} />
              ))}
            </div>
          </details>
        </CardContent>
      ) : null}
    </Card>
  )
}

const ScenarioCard = ({ scenario }: { scenario: ReorderResult["scenarios"][number] }) => (
  <Card className={scenario.recommended ? "ring-primary/40" : undefined}>
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{formatFrequency(scenario.frequency)}</CardTitle>
        <Badge variant={scenario.recommended ? "default" : scenario.exceedsCap ? "destructive" : "outline"}>
          {scenario.recommended ? "Recomendado" : scenario.exceedsCap ? "Supera límite" : formatRisk(scenario.stockoutRisk)}
        </Badge>
      </div>
      <CardDescription>{scenario.capNote ? formatCapNote(scenario.capNote) : "Dentro del límite preferido."}</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-2 text-sm">
      <MetricRow label="Reordenar cuando baje a" tooltip="Umbral donde deberías iniciar la recarga para cubrir el tiempo de espera." value={formatCurrency(scenario.reorderPoint)} />
      <MetricRow label="Balance objetivo" tooltip="Saldo al que conviene llegar después de recargar bajo esta estrategia." value={formatCurrency(scenario.targetBalance)} />
      <MetricRow label="Recarga ahora" tooltip="Cantidad necesaria hoy desde el saldo actual. Puede ser $0 aunque exista una estrategia futura." value={formatCurrency(scenario.immediateTopUpAmount)} />
      <MetricRow label="Recarga futura" tooltip="Cantidad estimada cuando el saldo haya bajado al punto de reorden." value={formatCurrency(scenario.reorderAmount)} />
      <MetricRow label="Ventas en riesgo" tooltip="Porcentaje de periodos históricos donde la demanda superaría este balance objetivo." value={formatPercent(scenario.estimatedMissedSalesPercent)} />
      {scenario.weekendCarryRequired ? <MetricRow label="Colchón fin de semana" tooltip="Saldo requerido para cubrir viernes a domingo cuando no hay recargas de fin de semana." value={formatCurrency(scenario.weekendCarryBuffer)} /> : null}
    </CardContent>
  </Card>
)

const getScenarioPreview = (scenarios: ReorderResult["scenarios"]) => {
  const recommended = scenarios.find((scenario) => scenario.recommended) ?? scenarios[0]
  const visible = new Map<string, ReorderResult["scenarios"][number]>()

  if (recommended) {
    visible.set(recommended.frequency, recommended)
  }

  scenarios
    .filter((scenario) => scenario.targetBalance < (recommended?.targetBalance ?? 0))
    .slice(-2)
    .forEach((scenario) => visible.set(scenario.frequency, scenario))

  scenarios
    .filter((scenario) => scenario.targetBalance > (recommended?.targetBalance ?? 0))
    .slice(0, 2)
    .forEach((scenario) => visible.set(scenario.frequency, scenario))

  const visibleScenarios = scenarios.filter((scenario) => visible.has(scenario.frequency))
  const hiddenScenarios = scenarios.filter((scenario) => !visible.has(scenario.frequency))

  return { hiddenScenarios, visibleScenarios }
}

const MetricRow = ({ label, tooltip, value }: { label: string; tooltip: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-1 text-muted-foreground">{label}<InfoTooltip text={tooltip} /></span>
    <span className="font-medium">{value}</span>
  </div>
)

const DemandBars = ({ title, rows }: { title: string; rows: { label: string; value: number }[] }) => {
  const maxValue = Math.max(1, ...rows.map((row) => row.value))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">{title}<InfoTooltip text="Promedio normalizado sobre la ventana histórica. No es la suma total del rango." /></CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[64px_1fr_110px] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(row.value / maxValue) * 100}%` }} />
            </div>
            <span className="text-right font-medium">{formatCurrency(row.value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const PeakHours = ({ rows }: { rows: ReorderResult["peakHoursByPeriod"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><TrendingUpIcon className="size-4" /> Horas pico por periodo <InfoTooltip text="Muestra la hora de mayor consumo promedio dentro de cada ventana definida por los horarios de recarga." /></CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periodo</TableHead>
            <TableHead>Hora pico</TableHead>
            <TableHead>Promedio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.period}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{String(row.peakHour).padStart(2, "0")}:00</TableCell>
              <TableCell>{formatCurrency(row.peakDemand)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

const TopConsumers = ({ rows }: { rows: ReorderResult["topConsumers"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-4" /> Clientes que más consumen <InfoTooltip text="Clientes con mayor participación en el consumo histórico seleccionado. Ayuda a detectar concentración de demanda." /></CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>CuentaID</TableHead>
            <TableHead>Consumo</TableHead>
            <TableHead>Participación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.externalClientId}>
              <TableCell>{row.clientName}</TableCell>
              <TableCell>{row.externalClientId}</TableCell>
              <TableCell>{formatCurrency(row.totalDemand)}</TableCell>
              <TableCell>{formatPercent(row.sharePercent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  })

const formatPercent = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "percent",
    maximumFractionDigits: 1,
  })

const getNextCheckLabel = (frequency: string) => {
  if (frequency.includes("2x")) {
    return "Siguiente recarga del día"
  }

  if (frequency.includes("3x") || frequency.includes("4x")) {
    return "Varias revisiones hoy"
  }

  if (frequency.includes("every")) {
    return formatFrequency(frequency)
  }

  return "Mañana laboral"
}

const formatFrequency = (frequency: string) => {
  if (frequency === "daily") {
    return "diario"
  }

  if (frequency === "2x daily") {
    return "2 veces al día"
  }

  if (frequency === "3x daily") {
    return "3 veces al día"
  }

  if (frequency === "4x daily") {
    return "4 veces al día"
  }

  if (frequency.startsWith("every ") && frequency.endsWith(" days")) {
    return frequency.replace("every ", "cada ").replace(" days", " días")
  }

  return frequency
}

const formatRisk = (risk: ReorderResult["scenarios"][number]["stockoutRisk"]) => {
  if (risk === "low") {
    return "riesgo bajo"
  }

  if (risk === "medium") {
    return "riesgo medio"
  }

  return "riesgo alto"
}

const formatConfidence = (confidence: ReorderResult["aggregateStats"]["confidence"]) => {
  if (confidence === "low") {
    return "baja"
  }

  if (confidence === "medium") {
    return "media"
  }

  return "alta"
}

const formatCapNote = (note: string) =>
  note
    .replace(/daily/g, "diario")
    .replace(/every (\d+) days/g, "cada $1 días")

const InfoTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Ver explicación"
        >
          <CircleHelpIcon className="size-3.5" />
        </button>
      }
    />
    <TooltipContent className="max-w-72 leading-5" side="top">
      {text}
    </TooltipContent>
  </Tooltip>
)
