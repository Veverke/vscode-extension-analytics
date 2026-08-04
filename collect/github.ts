export interface DiscoveredExtension {
  githubRepo: string;
  extensionId: string;
  namespace: string;
  name: string;
  displayName: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
}

interface GitHubFileContent {
  content: string;
  encoding: string;
}

interface PackageJson {
  name?: string;
  publisher?: string;
  displayName?: string;
  engines?: { vscode?: string };
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
 * Fetches and parses a single GitHub repo's package.json to check if it's
 * a VS Code extension. First tries the root package.json, then falls back
 * to extension/package.json (for monorepo layouts where the extension
 * manifest lives in a subdirectory). Returns null if the repo is not an
 * extension or if any error occurs.
 */
export async function scanSingleRepo(
  repoFullName: string,
  githubToken: string
): Promise<DiscoveredExtension | null> {
  const headers = buildHeaders(githubToken);

  const discovered = await tryScanPackageJson(repoFullName, 'package.json', headers)
    ?? await tryScanPackageJson(repoFullName, 'extension/package.json', headers);

  return discovered;

  async function tryScanPackageJson(
    repo: string,
    path: string,
    hdrs: Record<string, string>
  ): Promise<DiscoveredExtension | null> {
    try {
      const pkgResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents/${path}`,
        { headers: hdrs, signal: AbortSignal.timeout(30_000) }
      );

      if (pkgResponse.status === 404) {
        return null;
      }

      if (!pkgResponse.ok) {
        const body = await pkgResponse.text().catch(() => '');
        throw new Error(
          `GitHub API error ${pkgResponse.status} ${pkgResponse.statusText}${body ? ` - ${body}` : ''}`
        );
      }

      let pkgData: GitHubFileContent;
      try {
        pkgData = (await pkgResponse.json()) as GitHubFileContent;
      } catch (err) {
        console.error(
          `[discover] ${repo}: failed to parse ${path} response: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }

      let pkgJson: PackageJson;
      try {
        pkgJson = JSON.parse(
          Buffer.from(pkgData.content, 'base64').toString('utf-8')
        ) as PackageJson;
      } catch (err) {
        console.error(
          `[discover] ${repo}: failed to decode/parse ${path}: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }

      if (!pkgJson.engines?.vscode) {
        return null;
      }

      if (!pkgJson.publisher || !pkgJson.name) {
        console.log(`[discover] ${repo}: skipped (missing publisher or name in ${path})`);
        return null;
      }

      return {
        githubRepo: repo,
        extensionId: `${pkgJson.publisher}.${pkgJson.name}`,
        namespace: pkgJson.publisher,
        name: pkgJson.name,
        displayName: pkgJson.displayName ?? pkgJson.name,
      };
    } catch (err) {
      console.error(
        `[discover] ${repo}: skipped ${path} due to error: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }
}

/**
 * Scans a list of GitHub repository full names for VS Code extensions.
 * Each repo is checked for engines.vscode in its package.json.
 * Returns only repos that are valid VS Code extensions.
 */
export async function discoverFromRepos(
  repoFullNames: string[],
  githubToken: string
): Promise<DiscoveredExtension[]> {
  const results = await Promise.allSettled(
    repoFullNames.map((repo) => scanSingleRepo(repo, githubToken))
  );

  const discovered: DiscoveredExtension[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      discovered.push(result.value);
    }
  }
  return discovered;
}

export async function discoverVSCodeExtensions(
  githubUser: string,
  githubToken: string,
  options: { perPage?: number } = {}
): Promise<DiscoveredExtension[]> {
  const perPage = options.perPage ?? 100;
  const extensions: DiscoveredExtension[] = [];
  let page = 1;

  const headers = buildHeaders(githubToken);

  while (true) {
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUser}/repos?per_page=${perPage}&type=public&page=${page}`,
      { headers, signal: AbortSignal.timeout(30_000) }
    );

    const repos = (await reposResponse.json()) as GitHubRepo[];
    if (!Array.isArray(repos) || repos.length === 0) {
      if (!Array.isArray(repos) && (repos as { message?: string }).message) {
        throw new Error(`GitHub API error: ${(repos as { message: string }).message}`);
      }
      break;
    }

    const results = await Promise.allSettled(
      repos.map((repo) => scanSingleRepo(repo.full_name, githubToken))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        extensions.push(result.value);
      }
    }

    if (repos.length < perPage) break;
    page++;
  }

  return extensions;
}
