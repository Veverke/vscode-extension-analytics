import { describe, it, expect } from 'vitest'
import { formatInstallsTooltipValue } from '../../src/components/charts/InstallsChart'

describe('formatInstallsTooltipValue', () => {
  it('formats a number value', () => {
    const [label, name] = formatInstallsTooltipValue(1500, 'Installs')
    expect(label).toBe('1,500')
    expect(name).toBe('Installs')
  })

  it('formats zero', () => {
    const [label] = formatInstallsTooltipValue(0, 'Installs')
    expect(label).toBe('0')
  })

  it('returns N/A for null', () => {
    const [label, name] = formatInstallsTooltipValue(null, 'Installs')
    expect(label).toBe('N/A')
    expect(name).toBe('Installs')
  })

  it('returns N/A for undefined', () => {
    const [label] = formatInstallsTooltipValue(undefined, 'Installs')
    expect(label).toBe('N/A')
  })

  it('returns N/A for string value', () => {
    const [label] = formatInstallsTooltipValue('not-a-number', 'Installs')
    expect(label).toBe('N/A')
  })

  it('formats large numbers with locale separator', () => {
    const [label] = formatInstallsTooltipValue(15000, 'Installs')
    expect(label).toBe('15,000')
  })
})