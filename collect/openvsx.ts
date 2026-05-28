import type { OpenVsxSnapshot } from '../src/types/schema.js';

export async function fetchOpenVsxStats(
  namespace: string,
  name: string
): Promise<OpenVsxSnapshot | null> {
  const response = await fetch(
    `https://open-vsx.org/api/${namespace}/${name}`
  );

  if (response.status === 404) {
    console.warn(
      `[openvsx] Extension ${namespace}.${name} not found on Open VSX`
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
