export interface OpeningBalanceSnapshot {
  externalClientId: number
  businessDate: string
  timeZone: string
  openingBalance: number
  sourceUpdatedAt: string
  capturedAt: string
}

export interface OpeningBalanceSnapshotInput {
  externalClientId: number
  businessDate: string
  timeZone: string
  openingBalance: number
  sourceUpdatedAt: string
  capturedAt: string
}
