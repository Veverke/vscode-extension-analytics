/**
 * Skeleton card shown during the extension discovery loading state.
 * Provides animated placeholder indicators for the discover flow.
 */
export default function SkeletonCard() {
  return (
    <li className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__info">
        <span className="skeleton skeleton--text" style={{ width: 140, height: 16 }} />
        <span className="skeleton skeleton--text" style={{ width: 100, height: 12, marginTop: 6 }} />
        <span className="skeleton skeleton--text" style={{ width: 120, height: 12, marginTop: 6 }} />
      </div>
      <div className="skeleton-card__actions">
        <span className="skeleton skeleton--badge" style={{ width: 70, height: 14 }} />
        <span className="skeleton skeleton--badge" style={{ width: 90, height: 28 }} />
      </div>
    </li>
  )
}