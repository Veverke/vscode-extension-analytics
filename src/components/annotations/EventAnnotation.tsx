import type { ReferenceLineProps } from 'recharts';
import type { EventAnnotation, ReleaseEntry } from '../../types/schema';

// Color palette by event type
export const EVENT_TYPE_COLORS: Record<EventAnnotation['type'], string> = {
  release: '#22c55e', // green
  marketing: '#a855f7', // purple
  blog: '#3b82f6', // blue
  social: '#f97316', // orange
  other: '#6b7280', // gray
};

export const RELEASE_STROKE_WIDTH = 2.5;
export const EVENT_STROKE_WIDTH = 1.5;

/**
 * Produces an array of Recharts ReferenceLine props for a given set of
 * custom events and release entries.
 *
 * - Each event produces a vertical dashed line colored by type
 * - Each release produces a vertical dashed green line with release stroke width
 * - Lines are labeled with their event label or version string
 */
export function buildEventReferenceLines(
  events: EventAnnotation[],
  releases: ReleaseEntry[]
): ReferenceLineProps[] {
  const eventLines: ReferenceLineProps[] = events.map((event) => ({
    x: new Date(event.ts).getTime(),
    stroke: EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other,
    strokeDasharray: '5 5',
    strokeWidth: EVENT_STROKE_WIDTH,
    label: {
      value: event.label,
      position: 'top' as const,
      fontSize: 11,
      fill: EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other,
    },
    'data-event-type': event.type,
    'data-event-label': event.label,
  }));

  const releaseLines: ReferenceLineProps[] = releases.map((release) => ({
    x: new Date(release.publishedAt).getTime(),
    stroke: EVENT_TYPE_COLORS.release,
    strokeDasharray: '5 5',
    strokeWidth: RELEASE_STROKE_WIDTH,
    label: {
      value: `v${release.version}`,
      position: 'top' as const,
      fontSize: 11,
      fill: EVENT_TYPE_COLORS.release,
    },
    'data-event-type': 'release',
    'data-event-label': `v${release.version}`,
  }));

  return [...eventLines, ...releaseLines];
}