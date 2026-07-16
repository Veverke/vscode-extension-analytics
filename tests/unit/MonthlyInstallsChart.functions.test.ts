import { describe, it, expect } from 'vitest'
import { formatMonthLabel, EMPTY_DATA_MESSAGE } from '../../src/components/charts/MonthlyInstallsChart'

describe('MonthlyInstallsChart functions', () => {
  it('formatMonthLabel - formats year-month correctly', () => {
    const result = formatMonthLabel('2026-01')
    expect(result).toContain('2026')
    expect(result).toContain('Jan')
  })

  it('formatMonthLabel - handles December', () => {
    const result = formatMonthLabel('2026-12')
    expect(result).toContain('Dec')
  })

  it('EMPTY_DATA_MESSAGE is exported', () => {
    expect(EMPTY_DATA_MESSAGE).toBe('No monthly rollups available yet')
  })
})