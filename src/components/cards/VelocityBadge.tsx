interface VelocityBadgeProps {
  velocity: number;
}

export const VELOCITY_POSITIVE_CLASS = 'velocity-badge velocity-badge--positive';
export const VELOCITY_ZERO_CLASS = 'velocity-badge velocity-badge--zero';
export const VELOCITY_NEGATIVE_CLASS = 'velocity-badge velocity-badge--negative';

/**
 * Color-coded pill showing velocity direction and magnitude.
 * Positive: green ▲ +N
 * Zero:     gray  → 0
 * Negative: red   ▼ -N
 */
export default function VelocityBadge({ velocity }: VelocityBadgeProps) {
  const rounded = Math.round(velocity);

  if (rounded > 0) {
    return (
      <span
        className={VELOCITY_POSITIVE_CLASS}
        style={{ color: '#16a34a', fontWeight: 600 }}
        aria-label={`velocity +${rounded}`}
      >
        ▲ +{rounded}
      </span>
    );
  }

  if (rounded < 0) {
    return (
      <span
        className={VELOCITY_NEGATIVE_CLASS}
        style={{ color: '#dc2626', fontWeight: 600 }}
        aria-label={`velocity ${rounded}`}
      >
        ▼ {rounded}
      </span>
    );
  }

  return (
    <span
      className={VELOCITY_ZERO_CLASS}
      style={{ color: '#6b7280', fontWeight: 600 }}
      aria-label="velocity 0"
    >
      → 0
    </span>
  );
}