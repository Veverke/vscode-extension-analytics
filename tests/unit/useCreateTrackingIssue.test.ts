import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCreateTrackingIssue } from '../../src/hooks/useCreateTrackingIssue'

describe('useCreateTrackingIssue', () => {
  const originalOpen = window.open

  beforeEach(() => {
    window.open = vi.fn()
  })

  afterEach(() => {
    window.open = originalOpen
  })

  it('opens a pre-filled GitHub issue URL with correct params', () => {
    const { result } = renderHook(() => useCreateTrackingIssue())

    act(() => {
      result.current.openIssue('TestPublisher.test-extension')
    })

    expect(window.open).toHaveBeenCalledOnce()
    const url = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('github.com/Veverke/vscode-extension-analytics/issues/new')
    expect(url).toContain('template=add-extension.yml')
    expect(url).toContain('title=Add+extension%3A+TestPublisher.test-extension')
    expect(url).toContain('labels=tracking-request')
    expect((window.open as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe('_blank')
    expect((window.open as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBe('noopener,noreferrer')
  })
})