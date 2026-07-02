import { describe, expect, it, vi } from "vitest"

import { captureOpeningBalances } from "./snapshot-service"

const client = {
  id: "client-1",
  externalClientId: 1001,
  displayName: "Cliente Demo",
  clientKind: "standalone" as const,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("captureOpeningBalances", () => {
  it("does not overwrite an existing opening balance snapshot", async () => {
    const balanceRepository = {
      getAccountBalance: vi.fn(),
    }
    const snapshotRepository = {
      getSnapshot: vi.fn().mockResolvedValue({ externalClientId: 1001 }),
      createSnapshot: vi.fn(),
    }

    await expect(
      captureOpeningBalances({
        clients: [client],
        balanceRepository,
        snapshotRepository,
        now: new Date("2026-07-02T06:30:00.000Z"),
      })
    ).resolves.toMatchObject({
      businessDate: "2026-07-02",
      results: [{ externalClientId: 1001, status: "reused" }],
    })
    expect(balanceRepository.getAccountBalance).not.toHaveBeenCalled()
    expect(snapshotRepository.createSnapshot).not.toHaveBeenCalled()
  })

  it("reports the failed capture step", async () => {
    const balanceRepository = {
      getAccountBalance: vi.fn().mockRejectedValue(new Error("Cuenta no encontrada")),
    }
    const snapshotRepository = {
      getSnapshot: vi.fn().mockResolvedValue(null),
      createSnapshot: vi.fn(),
    }

    await expect(
      captureOpeningBalances({
        clients: [client],
        balanceRepository,
        snapshotRepository,
        now: new Date("2026-07-02T06:30:00.000Z"),
      })
    ).resolves.toMatchObject({
      results: [
        {
          externalClientId: 1001,
          status: "failed",
          step: "read_current_balance",
          error: "Cuenta no encontrada",
        },
      ],
    })
  })
})
