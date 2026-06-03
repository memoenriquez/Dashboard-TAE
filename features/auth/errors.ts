export class DashboardAccessDeniedError extends Error {
  constructor() {
    super("Forbidden")
    this.name = "DashboardAccessDeniedError"
  }
}
