import { describe, it, expect } from 'vitest'
import { getExtensionIconUrl, getExtensionIconUrlFallback } from '../../src/utils/icons'

describe('getExtensionIconUrl', () => {
  it('returns correct marketplace CDN URL for given namespace and name', () => {
    const url = getExtensionIconUrl('Veverke', 'chatwizard')
    expect(url).toBe(
      'https://Veverke.gallery.vsassets.io/_apis/public/gallery/publisher/Veverke/extension/chatwizard/latest/assetbyname/Microsoft.VisualStudio.Services.Icons.Default'
    )
  })

  it('includes namespace and name in the correct URL segments', () => {
    const url = getExtensionIconUrl('ms-python', 'python')
    expect(url).toContain('publisher/ms-python')
    expect(url).toContain('extension/python')
    expect(url).toContain('ms-python.gallery.vsassets.io')
  })

  it('ends with the correct asset path', () => {
    const url = getExtensionIconUrl('any-publisher', 'any-name')
    expect(url).toContain('/assetbyname/Microsoft.VisualStudio.Services.Icons.Default')
  })
})

describe('getExtensionIconUrlFallback', () => {
  it('returns correct marketplace API fallback URL', () => {
    const url = getExtensionIconUrlFallback('Veverke', 'chatwizard')
    expect(url).toBe(
      'https://marketplace.visualstudio.com/_apis/public/gallery/publisher/Veverke/extension/chatwizard/latest/assetbyname/Microsoft.VisualStudio.Services.Icons.Default'
    )
  })

  it('uses marketplace.visualstudio.com domain (not CDN)', () => {
    const url = getExtensionIconUrlFallback('Veverke', 'chatwizard')
    expect(url).toContain('marketplace.visualstudio.com')
    expect(url).not.toContain('gallery.vsassets.io')
  })

  it('preserves the same path structure as the CDN URL', () => {
    const cdn = getExtensionIconUrl('Veverke', 'chatwizard')
    const fallback = getExtensionIconUrlFallback('Veverke', 'chatwizard')
    // Only the domain differs — path after domain is identical
    const cdnPath = cdn.replace('https://Veverke.gallery.vsassets.io', '')
    const fallbackPath = fallback.replace('https://marketplace.visualstudio.com', '')
    expect(cdnPath).toBe(fallbackPath)
  })
})