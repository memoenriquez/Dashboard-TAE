export const OPENING_BALANCE_TIME_ZONE = "America/Mexico_City"

export const getBusinessDate = (
  input: { now?: Date; timeZone?: string } = {}
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: input.timeZone ?? OPENING_BALANCE_TIME_ZONE,
    year: "numeric",
  }).formatToParts(input.now ?? new Date())
  const byType = new Map(parts.map((part) => [part.type, part.value]))

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`
}

export const getBusinessDateRange = (businessDate: string) => ({
  from: new Date(`${businessDate}T00:00:00.000Z`),
  to: new Date(`${businessDate}T23:59:59.999Z`),
})
