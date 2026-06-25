import { DashboardAccessDeniedError } from "@/features/auth/errors"
import { calculateTelcelReorderPoints } from "@/features/telcel-reorder/reorder-service"
import { resolveTransactionFilters } from "@/features/transactions/filters"
import { createTaeApiTransactionRepository } from "@/lib/tae-api/transactions-repository"

import { withApiErrorHandling } from "../../_lib/api-route"
import { resolveTransactionRequestContext } from "../../_lib/dashboard-context"
import { DashboardValidationError } from "../../_lib/errors"
import { readJsonObject } from "../../_lib/request-body"

export const dynamic = "force-dynamic"

export const POST = withApiErrorHandling(async (request: Request) => {
  const context = await resolveTransactionRequestContext()

  if (!context.resolvedProfile.profile.isInternalAdmin) {
    throw new DashboardAccessDeniedError()
  }

  const body = await readJsonObject(request)
  const params = parseReorderParams(body)
  const repository = createTaeApiTransactionRepository()
  const currentFilters = resolveTransactionFilters({
    from: params.dateFrom,
    to: params.dateTo,
    status: "successful",
    operatorName: "Telcel",
    maxDays: 90,
  })
  const previousFilters = resolveTransactionFilters({
    from: getPreviousWindowStart(params.dateFrom, params.dateTo),
    to: getPreviousWindowEnd(params.dateFrom),
    status: "successful",
    operatorName: "Telcel",
    maxDays: 90,
  })
  const [currentRows, previousRows] = await Promise.all([
    repository.listTransactions({
      scope: context.scope,
      filters: currentFilters,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    }),
    repository.listTransactions({
      scope: context.scope,
      filters: previousFilters,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    }),
  ])

  return Response.json(
    calculateTelcelReorderPoints({
      currentTransactions: currentRows,
      previousTransactions: previousRows,
      params,
    })
  )
})

const parseReorderParams = (body: Record<string, unknown>) => {
  const dateFrom = parseDate(body.dateFrom, "dateFrom")
  const dateTo = parseDate(body.dateTo, "dateTo")
  const workingStartHour = parseHour(body.workingStartHour, "workingStartHour", 9)
  const workingEndHour = parseHour(body.workingEndHour, "workingEndHour", 18)

  if (dateFrom > dateTo) {
    throw new DashboardValidationError("La fecha inicial debe ser anterior a la final.")
  }

  if (workingEndHour <= workingStartHour) {
    throw new DashboardValidationError("La hora final laboral debe ser mayor a la inicial.")
  }

  return {
    dateFrom,
    dateTo,
    operatingDate: parseDate(body.operatingDate ?? new Date().toISOString(), "operatingDate"),
    currentBalance: parseNonNegativeNumber(body.currentBalance, "currentBalance", 0),
    maxLedgerBalance: parsePositiveNumber(body.maxLedgerBalance, "maxLedgerBalance", 50_000),
    leadTimeHours: parsePositiveNumber(body.leadTimeHours, "leadTimeHours", 2),
    workingHours: {
      start: workingStartHour,
      end: workingEndHour,
    },
    roundingIncrement: parsePositiveNumber(body.roundingIncrement, "roundingIncrement", 100),
    topUpTimes: parseTopUpTimes(body.topUpTimes),
  }
}

const parseDate = (value: unknown, fieldName: string) => {
  const date = new Date(String(value ?? ""))

  if (Number.isNaN(date.getTime())) {
    throw new DashboardValidationError(`Invalid ${fieldName}`)
  }

  return date
}

const parsePositiveNumber = (value: unknown, fieldName: string, fallback: number) => {
  const parsed = Number(value ?? fallback)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new DashboardValidationError(`Invalid ${fieldName}`)
  }

  return parsed
}

const parseNonNegativeNumber = (value: unknown, fieldName: string, fallback: number) => {
  const parsed = Number(value ?? fallback)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new DashboardValidationError(`Invalid ${fieldName}`)
  }

  return parsed
}

const parseHour = (value: unknown, fieldName: string, fallback: number) => {
  const parsed = Number(value ?? fallback)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
    throw new DashboardValidationError(`Invalid ${fieldName}`)
  }

  return parsed
}

const parseTopUpTimes = (value: unknown) => {
  if (!Array.isArray(value)) {
    return ["09:00", "14:00"]
  }

  const times = value.filter(
    (time): time is string => typeof time === "string" && /^\d{2}:\d{2}$/.test(time)
  )

  return times.length > 0 ? times : ["09:00", "14:00"]
}

const getPreviousWindowEnd = (dateFrom: Date) => {
  const end = new Date(`${dateFrom.toISOString().slice(0, 10)}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() - 1)
  return end
}

const getPreviousWindowStart = (dateFrom: Date, dateTo: Date) => {
  const dayCount = Math.max(
    1,
    Math.round((dateTo.getTime() - dateFrom.getTime()) / 86_400_000) + 1
  )
  const start = getPreviousWindowEnd(dateFrom)
  start.setUTCDate(start.getUTCDate() - dayCount + 1)
  return start
}
