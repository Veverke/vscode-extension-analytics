interface MomentumBadgeProps {
  score: number;
}

export const MOMENTUM_HIGH_CLASS = 'momentum-badge momentum-badge--high';
export const MOMENTUM_MID_CLASS = 'momentum-badge momentum-badge--mid';
export const MOMENTUM_LOW_CLASS = 'momentum-badge momentum-badge--low';

/**
 * Returns the CSS color for a given momentum score:
 * 67–100: green, 34–66: yellow, 0–33: red
 */
export function getMomentumColor(score: number): string {
  if (score >= 67) return '#16a34a'; // green
  if (score >= 34) return '#ca8a04'; // yellow
  return '#dc2626'; // red
}

/**
 * Returns the CSS class for a given momentum score.
 */
export function getMomentumClass(score: number): string {
  if (score >= 67) return MOMENTUM_HIGH_CLASS;
  if (score >= 34) return MOMENTUM_MID_CLASS;
  return MOMENTUM_LOW_CLASS;
}

/**
 * Renders a 0–100 momentum score with green/yellow/red color coding
 * and a small bar gauge beneath the number.
 */
export default function MomentumBadge({ score }: MomentumBadgeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const rounded = Math.round(clamped);
  const color = getMomentumColor(rounded);
  const className = getMomentumClass(rounded);

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
      aria-label={`momentum ${rounded}`}
    >
      <span style={{ color, fontWeight: 600, fontSize: '0.9em' }}>
        {rounded}
      </span>
      <span
        style={{
          display: 'block',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <span
          style={{
            display: 'block',
            width: `${rounded}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </span>
    </span>
  );
}