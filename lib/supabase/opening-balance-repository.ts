import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  OpeningBalanceSnapshotRepository,
} from "@/features/opening-balances/snapshot-service"
import type {
  OpeningBalanceSnapshot,
  OpeningBalanceSnapshotInput,
} from "@/features/opening-balances/types"

type JsonRecord = Record<string, unknown>

export const createOpeningBalanceSnapshotRepository = (
  supabase: SupabaseClient
): OpeningBalanceSnapshotRepository => ({
  getSnapshot: async (input) => {
    const { data, error } = await supabase
      .from("opening_balance_snapshots")
      .select("*")
      .eq("external_client_id", input.externalClientId)
      .eq("business_date", input.businessDate)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapSnapshot(data as JsonRecord) : null
  },
  createSnapshot: async (input) => {
    const { data, error } = await supabase
      .from("opening_balance_snapshots")
      .insert(toRow(input))
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapSnapshot(data as JsonRecord)
  },
})

const toRow = (input: OpeningBalanceSnapshotInput) => ({
  external_client_id: input.externalClientId,
  business_date: input.businessDate,
  time_zone: input.timeZone,
  opening_balance: input.openingBalance,
  source_updated_at: input.sourceUpdatedAt,
  captured_at: input.capturedAt,
})

const mapSnapshot = (row: JsonRecord): OpeningBalanceSnapshot => ({
  externalClientId: Number(row.external_client_id),
  businessDate: String(row.business_date),
  timeZone: String(row.time_zone),
  openingBalance: Number(row.opening_balance),
  sourceUpdatedAt: String(row.source_updated_at),
  capturedAt: String(row.captured_at),
})
