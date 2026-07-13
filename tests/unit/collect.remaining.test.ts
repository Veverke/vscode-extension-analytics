import { describe, it, expect } from 'vitest'
import { extractUniqueVersions } from '../../collect/marketplace'

describe('extractUniqueVersions', () => {
  it('deduplicates by version keeping the one with earlier lastUpdated', () => {
    const versions = [
      { version: '1.0.0', lastUpdated: '2026-02-01T00:00:00Z' },
      { version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' },
      { version: '1.1.0', lastUpdated: '2026-03-01T00:00:00Z' },
    ]
    const result = extractUniqueVersions(versions as any)
    expect(result).toHaveLength(2)
    // The one with earlier lastUpdated should be kept
    expect(result.find(v => v.version === '1.0.0')?.lastUpdated).toBe('2026-01-01T00:00:00Z')
  })

  it('keeps single version as-is', () => {
    const versions = [
      { version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' },
    ]
    const result = extractUniqueVersions(versions as any)
    expect(result).toHaveLength(1)
  })

  it('handles empty array', () => {
    expect(extractUniqueVersions([])).toEqual([])
  })
})