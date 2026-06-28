import { describe, expect, it } from "vitest"

import { parseReconciliationConfigInput } from "./validation"

describe("parseReconciliationConfigInput", () => {
  it("rejects SFTP delivery when daily generation is disabled", () => {
    expect(() => parseReconciliationConfigInput({
      ownerClientId: "client-id",
      isEnabled: false,
      reconciliationUsername: "CTC",
      cutoffTimezone: "America/Mexico_City",
      filenameTimeDifference: "-1",
      sftpEnabled: true,
      sftpHost: "sftp.example.com",
      sftpPort: 22,
      sftpUsername: "user",
      sftpRemotePath: "/uploads",
      sftpPasswordSecretName: "secret-name",
    })).toThrow("Daily file generation must be enabled before SFTP delivery")
  })
})
