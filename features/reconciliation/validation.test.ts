import { describe, expect, it } from "vitest"

import { parseReconciliationConfigInput } from "./validation"

describe("parseReconciliationConfigInput", () => {
  it("accepts safe filename segments", () => {
    const input = parseReconciliationConfigInput({
      ownerClientId: "client-id",
      isEnabled: true,
      reconciliationUsername: "CTC_01-TAE",
      cutoffTimezone: "America/Mexico_City",
      filenameTimeDifference: "-1",
      sftpEnabled: false,
    })

    expect(input.reconciliationUsername).toBe("CTC_01-TAE")
    expect(input.filenameTimeDifference).toBe("-1")
  })

  it("rejects unsafe filename segments", () => {
    expect(() => parseReconciliationConfigInput({
      ownerClientId: "client-id",
      isEnabled: true,
      reconciliationUsername: "../CTC",
      cutoffTimezone: "America/Mexico_City",
      filenameTimeDifference: "-1",
      sftpEnabled: false,
    })).toThrow("Invalid reconciliation username")

    expect(() => parseReconciliationConfigInput({
      ownerClientId: "client-id",
      isEnabled: true,
      reconciliationUsername: "CTC",
      cutoffTimezone: "America/Mexico_City",
      filenameTimeDifference: "../../x",
      sftpEnabled: false,
    })).toThrow("Invalid filename time difference")
  })

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
