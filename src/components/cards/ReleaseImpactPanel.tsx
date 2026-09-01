import { useState } from 'react';
import type { ReleaseImpact } from '../../metrics/releaseCorrelation';

export type SortField = keyof Pick<
  ReleaseImpact,
  | 'installsGained'
  | 'installsPerDay'
  | 'daysElapsed'
  | 'installsAtRelease'
  | 'downloadsPerDay'
>;

interface Props {
  impacts: ReleaseImpact[];
  githubRepo?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Normalize a registry `githubRepo` value (a bare "owner/repo" or a full
 * "https://github.com/owner/repo.git" URL) into a clean base GitHub URL.
 */
function toBaseRepoUrl(githubRepo: string): string {
  const trimmed = githubRepo.trim().replace(/\/+$/, '').replace(/\.git$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://github.com/${trimmed.replace(/^\/+/, '')}`;
}

/** GitHub tags use a "v" prefix ("v1.6.0") — ensure exactly one, whatever the data has. */
function toGithubTag(version: string): string {
  return `v${version.trim().replace(/^v/i, '')}`;
}

function buildGithubCompareUrl(
  githubRepo: string,
  prevVersion: string | undefined,
  version: string
): string {
  const base = toBaseRepoUrl(githubRepo);
  if (prevVersion) {
    return `${base}/compare/${toGithubTag(prevVersion)}...${toGithubTag(version)}`;
  }
  return `${base}/releases/tag/${toGithubTag(version)}`;
}

export default function ReleaseImpactPanel({ impacts, githubRepo }: Props) {
  const [sortField, setSortField] = useState<SortField>('installsGained');
  const [sortAsc, setSortAsc] = useState(false);

  if (impacts.length === 0) {
    return (
      <section className="release-section" aria-label="Release Impact">
        <h2>Release Impact</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>No release data available yet.</p>
      </section>
    );
  }

  const sorted = [...impacts].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    // Null values sort last regardless of direction
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    const diff = aVal - bVal;
    return sortAsc ? diff : -diff;
  });

  // Build a version → previous version map (sorted by publishedAt ascending)
  const byDate = [...impacts].sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt)
  );
  const prevVersionMap = new Map<string, string | undefined>();
  byDate.forEach((impact, i) => {
    prevVersionMap.set(impact.version, byDate[i - 1]?.version);
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortIndicator = (field: SortField) => {
    if (field !== sortField) return null;
    return sortAsc ? ' ▲' : ' ▼';
  };

  return (
    <section className="release-section" aria-label="Release Impact">
      <h2>Release Impact</h2>
      <table className="release-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Released</th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('installsAtRelease')}
            >
              Installs at Release{sortIndicator('installsAtRelease')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('installsGained')}
            >
              Installs Gained{sortIndicator('installsGained')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('daysElapsed')}
            >
              Days Active{sortIndicator('daysElapsed')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('installsPerDay')}
            >
              Installs/Day{sortIndicator('installsPerDay')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('downloadsPerDay')}
            >
              Downloads/Day{sortIndicator('downloadsPerDay')}
            </th>
            {githubRepo && <th>Diff</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((impact, index) => {
            const isTop = index === 0;
            const prevVersion = prevVersionMap.get(impact.version);
            return (
              <tr
                key={impact.version}
                className={isTop ? 'top-release' : undefined}
                style={
                  isTop
                    ? { backgroundColor: 'rgba(34, 197, 94, 0.15)' }
                    : undefined
                }
              >
                <td>{impact.version}</td>
                <td>{formatDate(impact.publishedAt)}</td>
                <td>{impact.installsAtRelease.toLocaleString()}</td>
                <td>{impact.installsGained.toLocaleString()}</td>
                <td>{impact.daysElapsed}</td>
                <td>{impact.installsPerDay.toFixed(1)}</td>
                <td>
                  {impact.downloadsPerDay === null
                    ? 'N/A'
                    : impact.downloadsPerDay.toFixed(1)}
                </td>
                {githubRepo && (
                  <td>
                    <a
                      href={buildGithubCompareUrl(
                        githubRepo,
                        prevVersion,
                        impact.version
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View diff
                    </a>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}