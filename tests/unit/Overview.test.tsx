import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Overview from '../../src/routes/Overview'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import fixtureExtensions from '../../fixtures/data/extensions.json'

function renderOverview() {
  return render(
    <MemoryRouter>
      <ExtensionsContext.Provider value={fixtureExtensions}>
        <Overview />
      </ExtensionsContext.Provider>
    </MemoryRouter>,
  )
}

describe('Overview', () => {
  it('renders the Overview heading', () => {
    renderOverview()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Overview')
  })

  it('renders a link for each extension', () => {
    renderOverview()
    for (const ext of fixtureExtensions) {
      const link = screen.getByRole('link', { name: ext.displayName })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', `/extension/${ext.id}`)
    }
  })
})
