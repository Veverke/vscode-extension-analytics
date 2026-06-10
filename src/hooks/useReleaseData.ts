import { useState, useEffect } from 'react';
import type { ReleaseEntry } from '../types/schema';

export interface UseReleaseDataResult {
  releases: ReleaseEntry[];
  loading: boolean;
  error: string | null;
}

export function useReleaseData(extensionId: string): UseReleaseDataResult {
  const [releases, setReleases] = useState<ReleaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`./data/${extensionId}.releases.json`)
      .then((res) => {
        // 404 means no releases file yet — treat as empty, not an error
        if (res.status === 404) {
          return [];
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ReleaseEntry[]>;
      })
      .then((data: ReleaseEntry[]) => {
        if (cancelled) return;
        setReleases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load releases';
        setError(message);
        setReleases([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [extensionId]);

  return { releases, loading, error };
}