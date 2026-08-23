import { useCallback } from 'react'

const NEW_ISSUE_URL =
  'https://github.com/Veverke/vscode-extension-analytics/issues/new'

/**
 * Hook that provides a function to open a pre-filled GitHub issue
 * for requesting that a new extension be tracked.
 *
 * Note: The `labels` query parameter is intentionally NOT included because
 * GitHub does not reliably apply labels via URL query params. The
 * `add-extension.yml` issue template's frontmatter handles applying the
 * `tracking-request` label automatically.
 */
export function useCreateTrackingIssue() {
  const openIssue = useCallback((extensionId: string) => {
    const params = new URLSearchParams({
      template: 'add-extension.yml',
      title: `Add extension: ${extensionId}`,
    })
    window.open(`${NEW_ISSUE_URL}?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }, [])

  return { openIssue }
}