import { TelcelReorderPointsDashboard } from "@/components/admin/telcel-reorder-points-dashboard"

export const dynamic = "force-dynamic"

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10)

export default function TelcelReorderPointsPage() {
  const today = new Date()

  return (
    <TelcelReorderPointsDashboard
      initialFilters={{
        dateFrom: toDateInputValue(new Date(today.getTime() - 89 * 86_400_000)),
        dateTo: toDateInputValue(today),
        currentBalance: "0",
        maxLedgerBalance: "50000",
        leadTimeHours: "2",
        roundingIncrement: "100",
        workingStartHour: "9",
        workingEndHour: "18",
        firstTopUpTime: "09:00",
        secondTopUpTime: "14:00",
      }}
    />
  )
}
