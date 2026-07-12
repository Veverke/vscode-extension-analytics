import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormulaTooltip from '../../src/components/annotations/FormulaTooltip'

describe('FormulaTooltip', () => {
  it('renders children and info icon', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Info about Velocity/i })).toBeInTheDocument()
  })

  it('shows popover on hover', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.mouseEnter(icon)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Velocity')).toBeInTheDocument()
    expect(screen.getByText('Δx/Δt')).toBeInTheDocument()
    expect(screen.getByText('How fast')).toBeInTheDocument()
  })

  it('hides popover on mouse leave', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.mouseEnter(icon)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.mouseLeave(icon)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles popover on click', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.click(icon)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.click(icon)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows popover on focus and hides on blur', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.focus(icon)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.blur(icon)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles popover on Enter key press', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.keyDown(icon, { key: 'Enter' })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(icon, { key: 'Enter' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles popover on Space key press', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.keyDown(icon, { key: ' ' })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(icon, { key: ' ' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('closes popover when clicking outside', () => {
    render(
      <FormulaTooltip label="Velocity" formula="Δx/Δt" description="How fast">
        <span>42</span>
      </FormulaTooltip>
    )
    const icon = screen.getByRole('button', { name: /Info about Velocity/i })
    fireEvent.mouseEnter(icon)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
