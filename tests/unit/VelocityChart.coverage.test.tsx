import { describe, it, expect } from 'vitest'
import {
  formatVelocityTooltipValue,
} from '../../src/components/charts/VelocityChart'

describe('VelocityChart - utility functions', () => {
  describe('formatVelocityTooltipValue', () => {
    it('formats positive number with + prefix', () => {
      const [label, name] = formatVelocityTooltipValue(50)
      expect(label).toBe('+50 installs')
      expect(name).toBe('Velocity')
    })

    it('formats negative number with - prefix', () => {
      const [label, name] = formatVelocityTooltipValue(-10)
      expect(label).toBe('-10 installs')
      expect(name).toBe('Velocity')
    })

    it('formats zero with + prefix', () => {
      const [label] = formatVelocityTooltipValue(0)
      expect(label).toBe('+0 installs')
    })

    it('handles non-numeric value as 0', () => {
      const [label] = formatVelocityTooltipValue(null)
      expect(label).toBe('+0 installs')
    })

    it('handles undefined value as 0', () => {
      const [label] = formatVelocityTooltipValue(undefined)
      expect(label).toBe('+0 installs')
    })

    it('formats large numbers with locale separator', () => {
      const [label] = formatVelocityTooltipValue(15000)
      expect(label).toBe('+15,000 installs')
    })
  })
})