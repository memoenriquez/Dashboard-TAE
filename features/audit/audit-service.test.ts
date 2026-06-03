import { describe, expect, it } from "vitest"

import { recordAuditEvent, type AuditRepository } from "./audit-service"
import type { AuditEventInput } from "./types"

describe("recordAuditEvent", () => {
  it("writes an audit event with normalized metadata", async () => {
    const writes: AuditEventInput[] = []
    const repository: AuditRepository = {
      insertAuditEvent: async (event) => {
        writes.push(event)
      },
    }

    await recordAuditEvent({
      repository,
      event: {
        actorUserId: "user-1",
        actorClientId: null,
        eventType: "csv_exported",
        targetType: "transactions",
        targetId: null,
      },
    })

    expect(writes).toEqual([
      {
        actorUserId: "user-1",
        actorClientId: null,
        eventType: "csv_exported",
        targetType: "transactions",
        targetId: null,
        metadata: {},
      },
    ])
  })
})
