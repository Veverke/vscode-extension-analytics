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

export async function discoverVSCodeExtensions(
  githubUser: string,
  githubToken: string,
  options: { perPage?: number } = {}
): Promise<DiscoveredExtension[]> {
  const perPage = options.perPage ?? 100;
  const extensions: DiscoveredExtension[] = [];
  let page = 1;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

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

    for (const repo of repos) {
      try {
        const pkgResponse = await fetch(
          `https://api.github.com/repos/${repo.full_name}/contents/package.json`,
          { headers, signal: AbortSignal.timeout(30_000) }
        );

        if (pkgResponse.status === 404) {
          console.log(`[discover] ${repo.full_name}: skipped (no package.json)`);
          continue;
        }

        if (!pkgResponse.ok) {
          const body = await pkgResponse.text().catch(() => '');
          throw new Error(
            `[discover] ${repo.full_name}: GitHub API error ${pkgResponse.status} ${pkgResponse.statusText}${body ? ` - ${body}` : ''}`
          );
        }

        let pkgData: GitHubFileContent;
        try {
          pkgData = (await pkgResponse.json()) as GitHubFileContent;
        } catch (err) {
          console.error(
            `[discover] ${repo.full_name}: failed to parse package.json response: ${err instanceof Error ? err.message : String(err)}`
          );
          continue;
        }

        let pkgJson: PackageJson;
        try {
          pkgJson = JSON.parse(
            Buffer.from(pkgData.content, 'base64').toString('utf-8')
          ) as PackageJson;
        } catch (err) {
          console.error(
            `[discover] ${repo.full_name}: failed to decode/parse package.json: ${err instanceof Error ? err.message : String(err)}`
          );
          continue;
        }

        if (!pkgJson.engines?.vscode) {
          console.log(`[discover] ${repo.full_name}: skipped (not a VS Code extension)`);
          continue;
        }

        extensions.push({
          githubRepo: repo.full_name,
          extensionId: `${pkgJson.publisher ?? ''}.${pkgJson.name ?? ''}`,
          namespace: pkgJson.publisher ?? '',
          name: pkgJson.name ?? '',
          displayName: pkgJson.displayName ?? pkgJson.name ?? '',
        });
      } catch (err) {
        console.error(
          `[discover] ${repo.full_name}: skipped due to error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (repos.length < perPage) break;
    page++;
  }

  return extensions;
}
