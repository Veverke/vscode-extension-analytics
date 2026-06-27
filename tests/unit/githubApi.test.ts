import { describe, it, expect } from 'vitest'
import {
  parseRateLimitFromHeaders,
  formatRateLimitMessage,
  checkRateLimit,
} from '../../src/utils/githubApi'

function mockHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries)
}

describe('parseRateLimitFromHeaders', () => {
  it('parses remaining and reset from headers', () => {
    const headers = mockHeaders({
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': '1700000000',
    })
    const result = parseRateLimitFromHeaders(headers)
    expect(result.remaining).toBe(42)
    expect(result.reset).toBe(1_700_000_000)
  })

  it('defaults to 0 when headers are missing', () => {
    const headers = mockHeaders({})
    const result = parseRateLimitFromHeaders(headers)
    expect(result.remaining).toBe(0)
    expect(result.reset).toBe(0)
  })
})

describe('formatRateLimitMessage', () => {
  it('includes suggestion about using a token', () => {
    const message = formatRateLimitMessage({ remaining: 0, reset: 2000000000 })
    expect(message).toContain('GitHub API rate limit reached')
    expect(message).toContain('Use a GitHub token')
    expect(message).toContain('60 req/hr')
  })
})

describe('checkRateLimit', () => {
  it('returns null when status is not 403', () => {
    const headers = mockHeaders({ 'x-ratelimit-remaining': '5' })
    expect(checkRateLimit(200, headers)).toBeNull()
    expect(checkRateLimit(404, headers)).toBeNull()
  })

  it('returns null when 403 but rate limit not exhausted', () => {
    const headers = mockHeaders({ 'x-ratelimit-remaining': '5' })
    expect(checkRateLimit(403, headers)).toBeNull()
  })

  it('returns rate limit message when 403 and 0 remaining', () => {
    const headers = mockHeaders({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '2000000000',
    })
    const result = checkRateLimit(403, headers)
    expect(result).not.toBeNull()
    expect(result!).toContain('rate limit reached')
    expect(result!).toContain('Use a GitHub token')
  })
})
