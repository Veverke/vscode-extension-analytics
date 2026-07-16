import { describe, it, expect } from 'vitest'
import { sortSummaries, type OverviewSortField } from '../../src/routes/Overview'
import type { ExtensionSummary } from '../../src/hooks/useAllExtensionsData'

function makeSummary(overrides: Partial<ExtensionSummary> & { id: string }): ExtensionSummary {
  const baseExtension = {
    namespace: 'test',
    name: overrides.id,
    githubRepo: 'test/repo',
    trackedSince: '2026-01-01',
  }
  return {
    extension: { id: overrides.id, displayName: overrides.extension?.displayName ?? overrides.id, ...baseExtension },
    data: overrides.data ?? [],
    currentInstalls: overrides.currentInstalls ?? 0,
    velocity: overrides.velocity ?? 0,
    momentum: overrides.momentum ?? 0,
    sparklinePoints: overrides.sparklinePoints ?? [],
  }
}

describe('sortSummaries', () => {
  const baseEntry = { namespace: 'test', githubRepo: 'test/repo', trackedSince: '2026-01-01' }
  const summaries = [
    makeSummary({ id: 'ext-a', extension: { id: 'ext-a', name: 'ext-a', displayName: 'Alpha', ...baseEntry }, currentInstalls: 100, velocity: 5, momentum: 0.8 }),
    makeSummary({ id: 'ext-b', extension: { id: 'ext-b', name: 'ext-b', displayName: 'Beta', ...baseEntry }, currentInstalls: 200, velocity: 3, momentum: 0.5 }),
    makeSummary({ id: 'ext-c', extension: { id: 'ext-c', name: 'ext-c', displayName: 'Gamma', ...baseEntry }, currentInstalls: 50, velocity: 10, momentum: 0.2 }),
  ]

  it('sorts by displayName ascending', () => {
    const result = sortSummaries(summaries, 'displayName', true)
    expect(result[0].extension.displayName).toBe('Alpha')
    expect(result[2].extension.displayName).toBe('Gamma')
  })

  it('sorts by displayName descending', () => {
    const result = sortSummaries(summaries, 'displayName', false)
    expect(result[0].extension.displayName).toBe('Gamma')
    expect(result[2].extension.displayName).toBe('Alpha')
  })

  it('sorts by currentInstalls ascending', () => {
    const result = sortSummaries(summaries, 'currentInstalls', true)
    expect(result[0].currentInstalls).toBe(50)
    expect(result[2].currentInstalls).toBe(200)
  })

  it('sorts by currentInstalls descending', () => {
    const result = sortSummaries(summaries, 'currentInstalls', false)
    expect(result[0].currentInstalls).toBe(200)
    expect(result[2].currentInstalls).toBe(50)
  })

  it('sorts by velocity ascending', () => {
    const result = sortSummaries(summaries, 'velocity', true)
    expect(result[0].velocity).toBe(3)
    expect(result[2].velocity).toBe(10)
  })

  it('sorts by velocity descending', () => {
    const result = sortSummaries(summaries, 'velocity', false)
    expect(result[0].velocity).toBe(10)
    expect(result[2].velocity).toBe(3)
  })

  it('sorts by momentum ascending', () => {
    const result = sortSummaries(summaries, 'momentum', true)
    expect(result[0].momentum).toBe(0.2)
    expect(result[2].momentum).toBe(0.8)
  })

  it('sorts by momentum descending (default)', () => {
    const result = sortSummaries(summaries, 'momentum', false)
    expect(result[0].momentum).toBe(0.8)
    expect(result[2].momentum).toBe(0.2)
  })

  it('defaults to momentum for unknown field', () => {
    const result = sortSummaries(summaries, 'unknown' as OverviewSortField, true)
    expect(result[0].momentum).toBe(0.2)
    expect(result[2].momentum).toBe(0.8)
  })

  it('does not mutate original array', () => {
    const original = [...summaries]
    sortSummaries(summaries, 'currentInstalls', true)
    expect(summaries).toEqual(original)
  })
})