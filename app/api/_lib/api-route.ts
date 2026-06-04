import { toApiErrorResponse } from "./errors"

type ApiHandler<TContext> = (
  request: Request,
  context: TContext
) => Response | Promise<Response>

export function withApiErrorHandling(
  handler: (request: Request) => Response | Promise<Response>
): (request: Request) => Promise<Response>
export function withApiErrorHandling<TContext>(
  handler: ApiHandler<TContext>
): (request: Request, context: TContext) => Promise<Response>
export function withApiErrorHandling<TContext>(
  handler: ApiHandler<TContext>
) {
  return async (request: Request, context: TContext): Promise<Response> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return toApiErrorResponse(error)
    }
  }
}
