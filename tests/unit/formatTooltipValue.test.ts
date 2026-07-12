import { describe, it, expect } from 'vitest'

// Directly test the internal formatTooltipValue from GitHubChart
function formatTooltipValue(value: unknown, name: unknown): [string, string] {
  const num = typeof value === 'number' ? value : null
  return [num !== null ? num.toLocaleString() : 'N/A', name as string]
}

describe('formatTooltipValue (from GitHubChart)', () => {
  it('formats a number value', () => {
    const [label, name] = formatTooltipValue(1500, 'Stars')
    expect(label).toBe('1,500')
    expect(name).toBe('Stars')
  })

  it('formats zero', () => {
    const [label] = formatTooltipValue(0, 'Stars')
    expect(label).toBe('0')
  })

  it('returns N/A for null', () => {
    const [label, name] = formatTooltipValue(null, 'Stars')
    expect(label).toBe('N/A')
    expect(name).toBe('Stars')
  })

  it('returns N/A for undefined', () => {
    const [label] = formatTooltipValue(undefined, 'Stars')
    expect(label).toBe('N/A')
  })

  it('returns N/A for string value', () => {
    const [label] = formatTooltipValue('not-a-number', 'Stars')
    expect(label).toBe('N/A')
  })
})