import { describe, it, expect } from 'vitest'
import { CustomTooltip, formatMonthLabel, EMPTY_DATA_MESSAGE } from '../../src/components/charts/MonthlyInstallsChart'

describe('CustomTooltip', () => {
  it('returns null when not active', () => {
    expect(CustomTooltip({ active: false, payload: [{ value: 100 }], label: '2026-01' })).toBeNull()
  })

  it('returns null when no payload', () => {
    expect(CustomTooltip({ active: true, payload: undefined, label: '2026-01' })).toBeNull()
  })

  it('returns null when no label', () => {
    expect(CustomTooltip({ active: true, payload: [{ value: 100 }], label: undefined })).toBeNull()
  })

  it('renders tooltip with all props', () => {
    const result = CustomTooltip({ active: true, payload: [{ value: 100 }], label: '2026-01' })
    expect(result).not.toBeNull()
    if (result) {
      const div = result as React.ReactElement<{ children: React.ReactNode }>
      expect(div.props.children).toBeDefined()
    }
  })
})

describe('formatMonthLabel', () => {
  it('formats January', () => {
    const result = formatMonthLabel('2026-01')
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })

  it('formats December', () => {
    const result = formatMonthLabel('2026-12')
    expect(result).toContain('Dec')
  })

  it('formats mid-year', () => {
    const result = formatMonthLabel('2026-06')
    expect(result).toContain('Jun')
  })
})

describe('EMPTY_DATA_MESSAGE', () => {
  it('is exported correctly', () => {
    expect(EMPTY_DATA_MESSAGE).toBe('No monthly rollups available yet')
  })
})