import { useCallback } from 'react'

const NEW_ISSUE_URL =
  'https://github.com/Veverke/vscode-extension-analytics/issues/new'

/**
 * Hook that provides a function to open a pre-filled GitHub issue
 * for requesting that a new extension be tracked.
 */
export function useCreateTrackingIssue() {
  const openIssue = useCallback((extensionId: string) => {
    const params = new URLSearchParams({
      template: 'add-extension.yml',
      title: `Add extension: ${extensionId}`,
      labels: 'tracking-request',
    })
    window.open(`${NEW_ISSUE_URL}?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }, [])

  return { openIssue }
}