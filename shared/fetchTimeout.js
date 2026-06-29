export const DEFAULT_UPSTREAM_TIMEOUT_MS = 10000

export async function fetchWithTimeout(
  input,
  init = {},
  timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'))
  }, timeoutMs)
  const handleAbort = () => controller.abort(init.signal?.reason)

  init.signal?.addEventListener('abort', handleAbort, { once: true })

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
    init.signal?.removeEventListener('abort', handleAbort)
  }
}
