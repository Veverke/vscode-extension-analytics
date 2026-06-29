import { describe, it, expect } from 'vitest';
import {
  buildEventReferenceLines,
  EVENT_TYPE_COLORS,
  RELEASE_STROKE_WIDTH,
  EVENT_STROKE_WIDTH,
} from '../../src/components/annotations/EventAnnotation';
import type { EventAnnotation, ReleaseEntry } from '../../src/types/schema';
import eventsFixture from '../../fixtures/data/events.json';
import releasesFixture from '../../fixtures/data/Veverke.chatwizard.releases.json';

const events = eventsFixture as EventAnnotation[];
const releases = releasesFixture as ReleaseEntry[];

describe('buildEventReferenceLines', () => {
  it('returns correct count — events.length + releases.length', () => {
    const result = buildEventReferenceLines(events, releases);
    expect(result).toHaveLength(events.length + releases.length);
  });

  it('release entries use green stroke (release color)', () => {
    const result = buildEventReferenceLines([], releases);
    for (const line of result) {
      expect(line.stroke).toBe(EVENT_TYPE_COLORS.release);
    }
  });

  it('release entries have release stroke width', () => {
    const result = buildEventReferenceLines([], releases);
    for (const line of result) {
      expect(line.strokeWidth).toBe(RELEASE_STROKE_WIDTH);
    }
  });

  it('event entries have event stroke width', () => {
    const result = buildEventReferenceLines(events, []);
    for (const line of result) {
      expect(line.strokeWidth).toBe(EVENT_STROKE_WIDTH);
    }
  });

  it('blog event uses blue stroke', () => {
    const blogEvents: EventAnnotation[] = [
      {
        ts: '2026-05-22T10:00:00.000Z',
        label: 'Blog post on Dev.to',
        type: 'blog',
      },
    ];
    const result = buildEventReferenceLines(blogEvents, []);
    expect(result[0].stroke).toBe(EVENT_TYPE_COLORS.blog);
  });

  it('social event uses orange stroke', () => {
    const socialEvents: EventAnnotation[] = [
      {
        ts: '2026-05-25T14:00:00.000Z',
        label: 'Posted on Hacker News',
        type: 'social',
      },
    ];
    const result = buildEventReferenceLines(socialEvents, []);
    expect(result[0].stroke).toBe(EVENT_TYPE_COLORS.social);
  });

  it('marketing event uses purple stroke', () => {
    const marketingEvents: EventAnnotation[] = [
      {
        ts: '2026-05-23T00:00:00.000Z',
        label: 'Product Hunt launch',
        type: 'marketing',
      },
    ];
    const result = buildEventReferenceLines(marketingEvents, []);
    expect(result[0].stroke).toBe(EVENT_TYPE_COLORS.marketing);
  });

  it('release lines are labeled with version prefixed by v', () => {
    const result = buildEventReferenceLines([], releases);
    const labels = result.map((r) => {
      const lbl = r.label as { value: string };
      return lbl.value;
    });
    for (const release of releases) {
      expect(labels).toContain(`v${release.version}`);
    }
  });

  it('event lines are labeled with event label text', () => {
    const result = buildEventReferenceLines(events, []);
    const labels = result.map((r) => {
      const lbl = r.label as { value: string };
      return lbl.value;
    });
    for (const event of events) {
      expect(labels).toContain(event.label);
    }
  });

  it('all lines have strokeDasharray set', () => {
    const result = buildEventReferenceLines(events, releases);
    for (const line of result) {
      expect(line.strokeDasharray).toBeTruthy();
    }
  });

  it('x value is numeric timestamp', () => {
    const result = buildEventReferenceLines(events, releases);
    for (const line of result) {
      expect(typeof line.x).toBe('number');
      expect(line.x as number).toBeGreaterThan(0);
    }
  });

  it('returns empty array when both inputs are empty', () => {
    const result = buildEventReferenceLines([], []);
    expect(result).toHaveLength(0);
  });

  it('unknown event type falls back to "other" color', () => {
    const customEvents: EventAnnotation[] = [
      {
        ts: '2026-06-01T00:00:00.000Z',
        label: 'Custom unknown event',
        type: 'unknown-type' as EventAnnotation['type'],
      },
    ];
    const result = buildEventReferenceLines(customEvents, []);
    expect(result[0].stroke).toBe(EVENT_TYPE_COLORS.other);
  });
});