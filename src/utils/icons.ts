/**
 * Builds the URL for a VS Code extension's marketplace icon.
 *
 * The icon is hosted on the VS Marketplace CDN at:
 *   https://{publisher}.gallery.vsassets.io/...
 *   /_apis/public/gallery/publisher/{publisher}/extension/{name}/latest/assetbyname/Microsoft.VisualStudio.Services.Icons.Default
 *
 * Falls back to a known-good marketplace icon URL as secondary option.
 */
export function getExtensionIconUrl(
  namespace: string,
  name: string
): string {
  return `https://${namespace}.gallery.vsassets.io/_apis/public/gallery/publisher/${namespace}/extension/${name}/latest/assetbyname/Microsoft.VisualStudio.Services.Icons.Default`
}

/**
 * Builds the Marketplace-API-based icon URL (fallback if CDN fails).
 */
export function getExtensionIconUrlFallback(
  namespace: string,
  name: string
): string {
  return `https://marketplace.visualstudio.com/_apis/public/gallery/publisher/${namespace}/extension/${name}/latest/assetbyname/Microsoft.VisualStudio.Services.Icons.Default`
}