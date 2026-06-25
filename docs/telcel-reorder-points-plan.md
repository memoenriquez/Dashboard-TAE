# Telcel Reorder Points — Implementation Plan

## Objective

Calculate the optimal internal ledger buffer and top-up strategy based on aggregate client consumption patterns. The goal is to keep the minimum balance necessary to serve demand without stockouts, reducing attack exposure.

## Scope

This feature adds a new admin-only page under `/dashboard/admin/telcel-reorder-points` that:
- Aggregates successful Telcel sales across all clients
- Calculates p95 daily demand (zero-demand days included)
- Generates ranked top-up scenarios (daily, 2× daily, dynamic 3×/4× daily when needed, and dynamic every-N-days strategies up to the preferred cap)
- Shows supporting analysis: hourly chart, day-of-week breakdown, peak hours, trend comparison, confidence notes, top consumers

**Not in scope:** per-client Telcel account reorder points, automated fraud detection, CSV export, persisted settings.

## Data Flow

1. Internal admin accesses the page.
2. The page resolves the admin's scope (all clients, server-side).
3. Historical transactions are fetched for the selected date range via the existing TAE API repository.
4. Current internal ledger balance is entered manually by the operator. The dashboard does not have visibility into this separate ledger.
5. The page computes:
   - p95 daily successful sold amount (calendar days, zero-included)
   - Average hourly demand distribution, normalized by days in the history window
   - Average day-of-week demand distribution, normalized by observed weekdays in the history window
   - Peak hours per top-up period
   - Per-client consumption share
   - Trend comparison (p95 current window vs previous window)
   - Confidence note based on sample size
6. For each scenario (daily, 2× daily, 3×/4× daily when needed, every 2 days, etc.):
   - Reorder point = minimum balance threshold before triggering a top-up
   - Target balance = expected demand until the next available top-up window, including lead-time demand and weekend carry when applicable
   - Reorder amount = amount needed to move from the reorder point/current balance to the target balance
   - Lead time buffer = expected demand while waiting for the same-day top-up to become available
   - Exposure = expected maximum internal ledger balance immediately after top-up
   - Weekend carry buffer = demand for days without top-up (e.g., Fri–Mon)
   - Missed sales estimate = % of scenario periods where demand exceeds the target balance
   - **Cap target check**: if Exposure > maxLedgerBalance, flag scenario as "exceeds preferred cap" and recommend higher frequency where possible
7. For scenarios that exceed the max ledger balance cap:
   - Calculate the minimum weekday frequency needed to keep normal operating exposure within the preferred cap
   - Generate additional intra-day scenarios (3x daily, 4x daily, etc.) when needed
   - If weekend coverage forces exposure above cap, recommend increasing the preferred cap because emergency weekend top-ups are not available
8. Results are ranked by a composite score (lower exposure, lower stockout risk), with cap-compliant scenarios preferred but cap-exceeding scenarios still shown as warnings.

## Implementation Steps

### Step 1 — Server-side calculation logic

Create `features/telcel-reorder/reorder-service.ts` with pure functions:

```ts
interface ReorderServiceInput {
  // All successful transactions for the date range
  successfulTransactions: {
    occurredAt: string // full ISO timestamp, needed for hourly and intra-day analysis
    soldAmount: number
    externalClientId: number
    visibleClientName: string
  }[]
  // Configurable parameters
  params: ReorderParams
  // Current internal ledger balance entered manually by the operator
  currentBalance: number
}

interface ReorderParams {
  dateFrom: Date
  dateTo: Date
  operatingDate: Date // current business date used to decide whether weekend carry applies
  maxLedgerBalance: number // preferred cap on total ledger exposure
  leadTimeHours: number
  workingHours: { start: number; end: number } // e.g., 9:00–18:00
  workdays: string[] // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  roundingIncrement: number // default 100
  topUpTimes: string[] // for 2× daily: ["09:00", "14:00"]
}

interface ReorderResult {
  // Aggregate stats
  aggregateStats: {
    p95DailyDemand: number
    meanDailyDemand: number
    maxDailyDemand: number
    totalDays: number
    activeDays: number
    sampleSize: number
    confidence: "low" | "medium" | "high"
  }
  // Average hourly distribution, not history-window totals
  hourlyDemand: { hour: number; demand: number }[]
  // Average day-of-week distribution, not history-window totals
  dayOfWeekDemand: { day: string; demand: number }[]
  // Peak hours per period
  peakHoursByPeriod: { period: string; peakHour: number; peakDemand: number }[]
  // Trend comparison
  trendComparison: {
    currentP95: number
    previousP95: number
    changePercent: number
  }
  // Per-client breakdown
  topConsumers: {
    externalClientId: number
    clientName: string
    totalDemand: number
    sharePercent: number
  }[]
  // Weekend buffer
  weekendBuffer: number
  // Scenarios
  scenarios: ReorderScenario[]
}

interface ReorderScenario {
  frequency: "daily" | "2x-daily" | "3x-daily" | "4x-daily" | "every-2-days" | "every-3-days" | "every-4-days"
  periodsPerDay: number
  reorderPoint: number // balance threshold that triggers top-up
  targetBalance: number // desired balance immediately after top-up
  reorderAmount: number // how much to top up from current/reorder-point balance
  leadTimeBuffer: number // extra for refill delay
  totalExposure: number // expected maximum ledger balance after top-up
  weekendCarryBuffer: number // extra for days without top-up (e.g., Fri–Mon)
  weekendCarryRequired: boolean // true if weekend coverage pushes buffer up
  estimatedMissedSalesPercent: number // % of scenario periods where demand > targetBalance
  stockoutRisk: "low" | "medium" | "high"
  exceedsCap: boolean // true if totalExposure > maxLedgerBalance
  capGap: number // totalExposure - maxLedgerBalance (how much over cap)
  rankingScore: number
  recommended: boolean
  capNote?: string // "Exceeds preferred $50,000 cap — consider 3× daily" or similar
}
```

### Step 2 — API route

Create `app/api/admin/telcel-reorder-points/route.ts`:

- Admin-only (same pattern as `/api/transactions/metrics`)
- Accepts POST with `ReorderParams` + manual `currentBalance`
- Fetches transactions from the TAE API repository (same repo used by metrics)
- Computes and returns `ReorderResult`

### Step 3 — Page UI

Create `app/dashboard/admin/telcel-reorder-points/page.tsx`:

- Reuses admin layout and navigation
- Reuses the same date filter component from the metrics page
- Inputs: date range, manual current internal ledger balance, preferred max ledger balance cap, rounding increment, working hours, lead time hours, top-up times (for 2× daily)
- Section 1: Summary cards
  - Operator-first recommendation: add now, target balance, runway, and next check
  - Current balance
  - p95 daily demand
  - Preferred max ledger balance cap (editable)
  - Estimated missed sales (for recommended scenario)
  - Status: "Above recommended", "Below recommended", "No data"
- Section 2: Hourly demand chart (reuse Recharts from metrics page)
- Section 3: Day-of-week demand breakdown (simple bar chart)
- Section 4: Trend comparison (p95 this window vs previous window)
- Section 5: Ranked scenario comparison (each with reorder point, target balance, immediate top-up, future top-up, exposure, stockout risk, cap warning)
  - Scenarios exceeding the preferred max ledger balance are clearly marked and shown with a suggested higher frequency where possible
  - If weekend carry exceeds the preferred cap, show "increase cap" because no emergency weekend top-up is available
  - Weekend carry is called out separately where relevant
- Section 6: Top consumers table
- Section 7: Weekend buffer callout (if weekend demand > 0); weekend carry affects today's target only on Friday/Saturday/Sunday
- Section 8: Peak hours per period guidance

### Step 4 — Navigation

Add nav item in `components/dashboard/dashboard-nav.tsx` under `adminItems`:

```ts
{ href: "/dashboard/admin/telcel-reorder-points", label: "Puntos de Reorden", icon: GaugeIcon },
```

### Step 5 — Tests

Create `features/telcel-reorder/reorder-service.test.ts`:

- Test p95 calculation with zero days included
- Test rounding logic
- Test scenario ranking (lower exposure, lower stockout risk)
- Test weekend buffer calculation
- Test confidence scoring (low sample → "low" confidence)
- Test that scenarios with zero demand show correct "no reorder needed"
- Test preferred max ledger balance cap: scenarios exceeding cap show `exceedsCap: true` and correct `capGap`
- Test that weekday cap-constrained scenarios recommend higher frequency
- Test that weekend cap-constrained scenarios recommend increasing cap instead of emergency weekend top-up

### Step 6 — Documentation

Update existing docs:
- `docs/prototype-contract.md` — add new route `/dashboard/admin/telcel-reorder-points` to the internal dashboard routes list
- Skip `docs/external-db-api-requirements.md` unless implementation proves a missing TAE field. Current normalized transactions already include timestamp, amount, client id, and visible client name.

Create:
- `docs/adr/0005-telcel-reorder-points-design.md` — ADR documenting the reorder point calculation approach, why p95 was chosen over mean/max, how weekend coverage is handled, and the max ledger balance cap constraint

## Design Decisions (from Grill Session)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Risk objective | Lean safety threshold | Minimize exposure, not "never stock out" |
| Reorder point definition | Frequency + amount | Covers both "how often" and "how much" |
| History window | 90-day default, adjustable | Captures weekly patterns without stale data |
| Demand metric | p95 daily successful sales | Covers normal spikes, excludes outliers |
| Zero days | Included | Reflects actual daily demand pattern |
| Spike handling | No auto-exclusion | Avoids guessing which sales are attacks |
| Scenario count | 4+ plus dynamic 3x/4x when cap requires it | Covers main modes and cap-driven frequency needs |
| Ranking | Cap-compliant, low-risk, longest coverage first | If the rounded target fits under the preferred cap, avoid unnecessary frequent top-ups |
| Lead time | Same-day, configurable hours | Matches operational reality |
| Weekend coverage | Separate buffer | No top-ups possible weekends |
| Top-up times | Custom per scenario | Flexibility for different schedules |
| Current status | Yes, with indicator | Immediate operational signal |
| Per-client breakdown | Top consumers table | Shows demand concentration |
| Trend comparison | p95 current vs previous | Detects demand shifts |
| Peak hours | Per period analysis | Guides top-up timing |
| Low data | Show p95 + confidence note | Still useful, not misleading |
| Route | `/dashboard/admin/telcel-reorder-points` | Clear domain grouping |
| Current ledger balance | Manual input | Internal ledger is separate and not visible to the dashboard |
| Max ledger cap | Yes, user-defined preferred target | Reflects operational security policy; warnings when exposure exceeds target |
| Weekend carry | Separate buffer for Fri–Mon gaps | No top-ups on weekends, so Friday/Saturday/Sunday target must cover through Monday; Monday-Thursday target uses normal runway |
| Docs updates | ADR + contract update | Ensures decision rationale is preserved alongside the prototype contract |
| UI priority | Operator answer first, diagnostics second | The page should answer "add now, target now, check again when" before showing charts |
| Strategy comparison | Show recommendation plus nearby alternatives; collapse the rest | Dynamic strategies can be numerous when the cap is high |

## File Changes

### New files

- `features/telcel-reorder/reorder-service.ts`
- `features/telcel-reorder/reorder-service.test.ts`
- `features/telcel-reorder/types.ts` (if types don't fit in service file)
- `app/api/admin/telcel-reorder-points/route.ts`
- `app/dashboard/admin/telcel-reorder-points/page.tsx`
- `components/admin/telcel-reorder-points-dashboard.tsx`
- `docs/adr/0005-telcel-reorder-points-design.md`

### Modified files

- `components/dashboard/dashboard-nav.tsx` (add nav item)
- `docs/prototype-contract.md` (add new route to routes list)

## Verification

After implementation:
- `npm test`
- `npm run lint`

## Dependencies

- Existing TAE API transaction repository (`lib/tae-api/transactions-repository.ts`)
- Existing chart components from metrics page (Recharts, shadcn/ui)
- Admin layout and auth gate from existing admin pages
