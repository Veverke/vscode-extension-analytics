import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import UntrackedCard from '../../src/components/cards/UntrackedCard'
import type { DiscoveredExtension } from '../../src/hooks/useAutoDiscover'

const mockExtension: DiscoveredExtension = {
  extensionId: 'Veverke.my-ext',
  namespace: 'Veverke',
  name: 'my-ext',
  displayName: 'My Extension',
  githubRepo: 'Veverke/my-ext',
}

describe('UntrackedCard', () => {
  it('renders extension name and ID', () => {
    render(<UntrackedCard extension={mockExtension} onTrack={() => {}} />)
    expect(screen.getByText('My Extension')).toBeInTheDocument()
    expect(screen.getByText('Veverke.my-ext')).toBeInTheDocument()
  })

  it('renders GitHub repo link', () => {
    render(<UntrackedCard extension={mockExtension} onTrack={() => {}} />)
    const link = screen.getByText('Veverke/my-ext')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://github.com/Veverke/my-ext')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders "Not Tracked" badge', () => {
    render(<UntrackedCard extension={mockExtension} onTrack={() => {}} />)
    expect(screen.getByText('⬜ Not Tracked')).toBeInTheDocument()
  })

  it('renders "Track on GitHub" CTA button', () => {
    render(<UntrackedCard extension={mockExtension} onTrack={() => {}} />)
    const button = screen.getByText('Track on GitHub')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('calls onTrack callback when CTA button is clicked', () => {
    const onTrack = vi.fn()
    render(<UntrackedCard extension={mockExtension} onTrack={onTrack} />)
    screen.getByText('Track on GitHub').click()
    expect(onTrack).toHaveBeenCalledTimes(1)
    expect(onTrack).toHaveBeenCalledWith('Veverke.my-ext')
  })

  it('uses name as fallback when displayName is empty', () => {
    const extWithoutDisplay: DiscoveredExtension = {
      extensionId: 'Veverke.no-display',
      namespace: 'Veverke',
      name: 'no-display',
      displayName: '',
      githubRepo: 'Veverke/no-display',
    }
    render(<UntrackedCard extension={extWithoutDisplay} onTrack={() => {}} />)
    expect(screen.getByText('no-display')).toBeInTheDocument()
  })
})
