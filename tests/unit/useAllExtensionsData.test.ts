import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAllExtensionsData } from '../../src/hooks/useAllExtensionsData'

describe('useAllExtensionsData', () => {
  it('handles empty extensions list — no fetch needed, no OOM risk', async () => {
    const { result, unmount } = renderHook(() => useAllExtensionsData([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toHaveLength(0)
    expect(Object.keys(result.current.errors)).toHaveLength(0)
    unmount()
  })
})