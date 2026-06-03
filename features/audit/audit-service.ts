import type { AuditEventInput } from "./types"

export interface AuditRepository {
  insertAuditEvent: (event: AuditEventInput) => Promise<void>
}

export interface RecordAuditEventInput {
  repository: AuditRepository
  event: AuditEventInput
}

export const recordAuditEvent = async (
  input: RecordAuditEventInput
): Promise<void> => {
  await input.repository.insertAuditEvent({
    ...input.event,
    metadata: input.event.metadata ?? {},
  })
}
