import { useState, useEffect } from 'react';
import type { ExtensionEntry, DataPoint } from '../types/schema';
import { loadData, extensionDataPath } from '../utils/dataLoader';
import { computeVelocity } from '../metrics/velocity';
import { computeMomentum } from '../metrics/momentum';

export interface ExtensionSummary {
  extension: ExtensionEntry;
  data: DataPoint[];
  currentInstalls: number;
  currentDownloads: number; // most recent open vsx download count
  velocity: number; // most recent velocity value
  momentum: number; // computeMomentum result
  sparklinePoints: number[]; // last 14 install values for sparkline
}

export interface UseAllExtensionsDataResult {
  results: ExtensionSummary[];
  loading: boolean;
  errors: Record<string, string>;
}

/**
 * Loads time-series data for all given extensions in parallel.
 * Returns per-row error isolation: if one extension fails, others still load.
 */
export function useAllExtensionsData(
  extensions: ExtensionEntry[]
): UseAllExtensionsDataResult {
  const [results, setResults] = useState<ExtensionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derive a stable dependency key from extension IDs so that a new
  // array reference (e.g. inline []) does not trigger an infinite loop.
  const extensionsKey = extensions.length === 0
    ? ''
    : extensions.map((e) => e.id).join(',');

  useEffect(() => {
    if (extensions.length === 0) {
      setResults([]);
      setErrors({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.allSettled(
      extensions.map(async (ext): Promise<ExtensionSummary> => {
        const raw = await loadData<unknown>(extensionDataPath(ext.id));
        const data = Array.isArray(raw) ? (raw as DataPoint[]) : [];

        const velocity = computeVelocity(data);
        const currentVelocity =
          velocity.length > 0 ? velocity[velocity.length - 1] : 0;
        const momentum = computeMomentum(data);
        const currentInstalls =
          data.length > 0 ? data[data.length - 1].marketplace.installs : 0;
        const currentDownloads =
          data.length > 0 ? data[data.length - 1].openVsx?.downloads ?? 0 : 0;
        const sparklinePoints = data
          .slice(-14)
          .map((p) => p.marketplace.installs);

        return {
          extension: ext,
          data,
          currentInstalls,
          currentDownloads,
          velocity: currentVelocity,
          momentum,
          sparklinePoints,
        };
      })
    ).then((settled) => {
      if (cancelled) return;

      const newResults: ExtensionSummary[] = [];
      const newErrors: Record<string, string> = {};

      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          newResults.push(result.value);
        } else {
          const ext = extensions[i];
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : 'Failed to load';
          newErrors[ext.id] = message;
        }
      });

      setResults(newResults);
      setErrors(newErrors);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [extensionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, loading, errors };
}