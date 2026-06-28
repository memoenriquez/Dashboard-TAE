export class ReconciliationGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReconciliationGenerationError"
  }
}

export class ReconciliationSftpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReconciliationSftpError"
  }
}
