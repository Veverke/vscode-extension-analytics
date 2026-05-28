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

  while (true) {
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUser}/repos?per_page=${perPage}&type=public&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    const repos = (await reposResponse.json()) as GitHubRepo[];
    if (!Array.isArray(repos) || repos.length === 0) break;

    for (const repo of repos) {
      try {
        const pkgResponse = await fetch(
          `https://api.github.com/repos/${repo.full_name}/contents/package.json`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          }
        );

        if (pkgResponse.status === 404) continue;

        const pkgData = (await pkgResponse.json()) as GitHubFileContent;
        const pkgJson = JSON.parse(
          Buffer.from(pkgData.content, 'base64').toString('utf-8')
        ) as PackageJson;

        if (!pkgJson.engines?.vscode) continue;

        extensions.push({
          githubRepo: repo.full_name,
          extensionId: `${pkgJson.publisher}.${pkgJson.name}`,
          namespace: pkgJson.publisher ?? '',
          name: pkgJson.name ?? '',
          displayName: pkgJson.displayName ?? pkgJson.name ?? '',
        });
      } catch {
        // silently skip repos that fail
      }
    }

    if (repos.length < perPage) break;
    page++;
  }

  return extensions;
}
