import { describe, it, expect } from 'vitest'
import { toChartPoints, formatDate } from '../../src/utils/normalize'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

describe('toChartPoints', () => {
  describe('installs', () => {
    it('output length equals input length', () => {
      const result = toChartPoints(fixture, 'installs')
      expect(result).toHaveLength(fixture.length)
    })

    it('first point value matches fixture first marketplace.installs', () => {
      const result = toChartPoints(fixture, 'installs')
      expect(result[0].value).toBe(fixture[0].marketplace.installs)
    })

    it('ts is a positive number (milliseconds since epoch)', () => {
      const result = toChartPoints(fixture, 'installs')
      expect(result[0].ts).toBeGreaterThan(0)
    })
  })

  describe('rating', () => {
    it('all values are in 0–5 range', () => {
      const result = toChartPoints(fixture, 'rating')
      result.forEach(p => {
        expect(p.value).toBeGreaterThanOrEqual(0)
        expect(p.value).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('openVsxDownloads', () => {
    it('output length equals input length', () => {
      const result = toChartPoints(fixture, 'openVsxDownloads')
      expect(result).toHaveLength(fixture.length)
    })

    it('extracts downloads from openVsx object', () => {
      const result = toChartPoints(fixture, 'openVsxDownloads')
      const idx = fixture.findIndex(p => p.openVsx !== null)
      if (idx !== -1) {
        expect(result[idx].value).toBe(fixture[idx].openVsx!.downloads)
      }
    })

    it('returns 0 when openVsx is null', () => {
      const result = toChartPoints(fixture, 'openVsxDownloads')
      fixture.forEach((p, i) => {
        if (p.openVsx === null) {
          expect(result[i].value).toBe(0)
        }
      })
    })
  })
})

describe('formatDate', () => {
  it('formats timestamp as "MMM D" format', () => {
    const ts = new Date('2026-05-15').getTime()
    expect(formatDate(ts)).toBe('May 15')
  })
})

describe('toChartPoints — branch coverage', () => {
  it('rating field — returns 0 when averageRating is undefined', () => {
    const point: DataPoint = {
      ts: '2026-05-15T00:00:00Z',
      marketplace: { installs: 100, updates: 10, averageRating: undefined, ratingCount: 0, trendingWeekly: 0, trendingMonthly: 0 },
      openVsx: null,
    }
    const result = toChartPoints([point], 'rating')
    expect(result[0].value).toBe(0)
  })

  it('openVsxDownloads field — returns 0 when openVsx is null', () => {
    const point: DataPoint = {
      ts: '2026-05-15T00:00:00Z',
      marketplace: { installs: 100, updates: 10, averageRating: 4.0, ratingCount: 5, trendingWeekly: 0, trendingMonthly: 0 },
      openVsx: null,
    }
    const result = toChartPoints([point], 'openVsxDownloads')
    expect(result[0].value).toBe(0)
  })
})
