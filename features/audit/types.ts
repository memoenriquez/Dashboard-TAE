export type AuditEventType =
  | "csv_exported"
  | "permission_changed"
  | "client_mapping_changed"
  | "internal_admin_accessed"

export interface AuditEvent {
  id: string
  actorUserId: string | null
  actorClientId: string | null
  eventType: AuditEventType
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditEventInput {
  actorUserId: string | null
  actorClientId: string | null
  eventType: AuditEventType
  targetType: string | null
  targetId: string | null
  metadata?: Record<string, unknown>
}
