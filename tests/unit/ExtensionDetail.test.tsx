import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import ExtensionDetail from '../../src/routes/ExtensionDetail'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import fixtureExtensions from '../../fixtures/data/extensions.json'

function renderDetail(extensionId: string) {
  const router = createMemoryRouter(
    [{ path: '/extension/:extensionId', element: <ExtensionDetail /> }],
    { initialEntries: [`/extension/${extensionId}`] },
  )

  return render(
    <ExtensionsContext.Provider value={fixtureExtensions}>
      <RouterProvider router={router} />
    </ExtensionsContext.Provider>,
  )
}

describe('ExtensionDetail', () => {
  it('renders the extension display name as h1', () => {
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chat Wizard')
  })

  it('renders placeholder sections', () => {
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('region', { name: 'Charts' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Metrics' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Projections' })).toBeInTheDocument()
  })

  it('renders "not found" message for unknown extensionId', () => {
    renderDetail('does.not.exist')
    expect(screen.getByText('Extension not found')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
