import type { IncomingMessage, ServerResponse } from 'node:http'

export function createLocalApiMiddleware(): (
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: unknown) => void
) => Promise<void>
