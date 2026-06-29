export const DEFAULT_UPSTREAM_TIMEOUT_MS: number

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number
): Promise<Response>
