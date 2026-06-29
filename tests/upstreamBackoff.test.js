import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  UPSTREAM_BLOCK_KEY,
  blockUpstream,
  getRemainingBlockSeconds,
  parseRetryAfter
} from '../server/upstreamBackoff.js'

describe('upstream backoff', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('parses and clamps Retry-After values', () => {
    expect(parseRetryAfter('12.2')).toBe(13)
    expect(parseRetryAfter('0')).toBe(1)
    expect(parseRetryAfter('999999')).toBe(86400)
  })

  test('stores a shared provider block with matching expiry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-29T12:00:00Z'))

    const writes = []
    const cache = {
      set: async (key, value, options) => {
        writes.push({ key, value, options })
      }
    }

    await expect(blockUpstream(cache, '60')).resolves.toBe(60)
    expect(writes[0]).toMatchObject({
      key: UPSTREAM_BLOCK_KEY,
      value: Date.now() + 60000,
      options: { ttl: 60 }
    })
    expect(getRemainingBlockSeconds(writes[0].value)).toBe(60)
  })
})
