import type { GitHubSnapshot } from '../src/types/schema.js';

interface GitHubRepoData {
  stargazers_count: number;
  forks_count: number;
  owner: { login: string };
}

interface GitHubContributorStats {
  total: number;
  author: { login: string };
  weeks: Array<{ w: number; a: number; d: number; c: number }>;
}

interface GitHubIssue {
  user: { login: string };
  pull_request?: unknown;
}

interface GitHubPullRequest {
  user: { login: string };
}

interface GitHubReview {
  user: { login: string };
}

function buildHeaders(githubToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  return headers;
}

/**
 * Fetches the total number of non-owner contributions (commits) from
 * the contributor stats API. This includes all-time commit counts per contributor.
 */
async function fetchNonOwnerCommits(
  repoFullName: string,
  ownerLogin: string,
  githubToken: string
): Promise<number> {
  const headers = buildHeaders(githubToken);
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/stats/contributors`,
    { headers, signal: AbortSignal.timeout(30_000) }
  );

  if (!response.ok) {
    // 202 means GitHub is computing stats — treat as 0 for now
    if (response.status === 202) return 0;
    throw new Error(
      `[github-stats] Failed to fetch contributor stats for ${repoFullName}: ${response.status}`
    );
  }

  const data = (await response.json()) as GitHubContributorStats[];
  if (!Array.isArray(data)) return 0;

  return data
    .filter((c) => c.author?.login !== ownerLogin)
    .reduce((sum, c) => sum + (c.total || 0), 0);
}

/**
 * Fetches the count of non-owner issues (excluding pull requests).
 * Searches for issues created by users other than the repo owner.
 */
async function fetchNonOwnerIssues(
  repoFullName: string,
  ownerLogin: string,
  githubToken: string
): Promise<number> {
  const headers = buildHeaders(githubToken);
  let totalCount = 0;
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/issues?state=all&per_page=${perPage}&page=${page}&filter=all`,
      { headers, signal: AbortSignal.timeout(15_000) }
    );

    if (!response.ok) {
      throw new Error(
        `[github-stats] Failed to fetch issues for ${repoFullName}: ${response.status}`
      );
    }

    const issues = (await response.json()) as GitHubIssue[];
    if (!Array.isArray(issues) || issues.length === 0) break;

    // Count non-owner, non-PR issues
    for (const issue of issues) {
      if (issue.user?.login !== ownerLogin && !issue.pull_request) {
        totalCount++;
      }
    }

    if (issues.length < perPage) break;
    page++;
  }

  return totalCount;
}

/**
 * Fetches the count of non-owner pull requests.
 */
async function fetchNonOwnerPRs(
  repoFullName: string,
  ownerLogin: string,
  githubToken: string
): Promise<number> {
  const headers = buildHeaders(githubToken);
  let totalCount = 0;
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=${perPage}&page=${page}`,
      { headers, signal: AbortSignal.timeout(15_000) }
    );

    if (!response.ok) {
      throw new Error(
        `[github-stats] Failed to fetch PRs for ${repoFullName}: ${response.status}`
      );
    }

    const prs = (await response.json()) as GitHubPullRequest[];
    if (!Array.isArray(prs) || prs.length === 0) break;

    for (const pr of prs) {
      if (pr.user?.login !== ownerLogin) {
        totalCount++;
      }
    }

    if (prs.length < perPage) break;
    page++;
  }

  return totalCount;
}

/**
 * Fetches the count of non-owner code reviews on pull requests.
 * This is an approximation — we count reviews on PRs where the reviewer
 * is not the repo owner.
 */
async function fetchNonOwnerReviews(
  repoFullName: string,
  ownerLogin: string,
  githubToken: string
): Promise<number> {
  const headers = buildHeaders(githubToken);
  let totalCount = 0;
  let page = 1;
  const perPage = 100;

  // First get all PRs
  while (true) {
    const prResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=${perPage}&page=${page}`,
      { headers, signal: AbortSignal.timeout(15_000) }
    );

    if (!prResponse.ok) break;

    const prs = (await prResponse.json()) as Array<{ number: number }>;
    if (!Array.isArray(prs) || prs.length === 0) break;

    // For each PR, fetch reviews
    for (const pr of prs) {
      const reviewResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/pulls/${pr.number}/reviews?per_page=100`,
        { headers, signal: AbortSignal.timeout(15_000) }
      );

      if (!reviewResponse.ok) continue;

      const reviews = (await reviewResponse.json()) as GitHubReview[];
      if (!Array.isArray(reviews)) continue;

      for (const review of reviews) {
        if (review.user?.login !== ownerLogin) {
          totalCount++;
        }
      }
    }

    if (prs.length < perPage) break;
    page++;
  }

  return totalCount;
}

/**
 * Fetches GitHub stats (stars, forks, contributions) for a given repository.
 *
 * Contributions is a composite metric: non-owner commits + non-owner issues +
 * non-owner PRs + non-owner code reviews.
 *
 * @param repoFullName - Full repository name (e.g. "Veverke/ChatWizard")
 * @param githubToken - GitHub personal access token (optional, for higher rate limits)
 */
export async function fetchGitHubStats(
  repoFullName: string,
  githubToken: string
): Promise<GitHubSnapshot> {
  const headers = buildHeaders(githubToken);

  // Fetch repo info for stars, forks, and owner
  const repoResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}`,
    { headers, signal: AbortSignal.timeout(15_000) }
  );

  if (!repoResponse.ok) {
    throw new Error(
      `[github-stats] Failed to fetch repo ${repoFullName}: ${repoResponse.status}`
    );
  }

  const repoData = (await repoResponse.json()) as GitHubRepoData;

  // Get repo owner to filter out owner contributions
  const owner = repoData.owner.login;

  // Fetch contribution components in parallel
  const [commits, issues, prs, reviews] = await Promise.all([
    fetchNonOwnerCommits(repoFullName, owner, githubToken),
    fetchNonOwnerIssues(repoFullName, owner, githubToken),
    fetchNonOwnerPRs(repoFullName, owner, githubToken),
    fetchNonOwnerReviews(repoFullName, owner, githubToken),
  ]);

  return {
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    contributions: commits + issues + prs + reviews,
    contributionsBreakdown: {
      commits,
      issues,
      prs,
      reviews,
    },
  };
}