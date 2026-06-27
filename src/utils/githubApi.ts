export interface GitHubRateLimit {
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Parses GitHub API rate limit information from response headers.
 */
export function parseRateLimitFromHeaders(headers: Headers): GitHubRateLimit {
  const remaining = parseInt(headers.get('x-ratelimit-remaining') ?? '0', 10);
  const reset = parseInt(headers.get('x-ratelimit-reset') ?? '0', 10);
  return { remaining, reset };
}

/**
 * Formats a rate limit error message based on the remaining/reset info.
 * Suggests using a GitHub token for higher limits.
 */
export function formatRateLimitMessage(rateLimit: GitHubRateLimit): string {
  const resetDate = new Date(rateLimit.reset * 1000);
  return (
    `GitHub API rate limit reached. Resets at ${resetDate.toLocaleTimeString()}. ` +
    'Use a GitHub token for higher limits (60 req/hr unauthenticated).'
  );
}

/**
 * Checks if the rate limit has been exhausted (403 status + 0 remaining).
 * Returns a user-friendly message if exhausted, or null if OK.
 */
export function checkRateLimit(status: number, headers: Headers): string | null {
  if (status !== 403) return null;
  const rateLimit = parseRateLimitFromHeaders(headers);
  if (rateLimit.remaining === 0) {
    return formatRateLimitMessage(rateLimit);
  }
  return null;
}
