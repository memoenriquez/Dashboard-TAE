export class ReconciliationGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReconciliationGenerationError"
  }
}
