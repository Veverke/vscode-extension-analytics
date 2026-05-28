import type { OpenVsxSnapshot } from '../src/types/schema.js';

export async function fetchOpenVsxStats(
  namespace: string,
  name: string
): Promise<OpenVsxSnapshot | null> {
  const response = await fetch(
    `https://open-vsx.org/api/${namespace}/${name}`,
    { signal: AbortSignal.timeout(30_000) }
  );

  if (!response.ok) {
    if (response.status === 404) {
      console.warn(
        `[openvsx] Extension ${namespace}.${name} not found on Open VSX`
      );
      return null;
    }

    const body = await response.text().catch(() => '');
    console.error(
      `[openvsx] Failed to fetch ${namespace}.${name}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    );
    return null;
  }

  const data = (await response.json()) as {
    downloadCount?: number;
    averageRating?: number | null;
    reviewCount?: number;
  };

  return {
    downloads: data.downloadCount ?? 0,
    averageRating: data.averageRating ?? null,
    ratingCount: data.reviewCount ?? 0,
  };
}
