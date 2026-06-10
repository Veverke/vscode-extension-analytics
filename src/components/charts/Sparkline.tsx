interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Minimal pure-SVG sparkline for embedding in table cells.
 * Normalizes input points to fit within the given dimensions.
 * No axes, no tooltip, no labels.
 */
export default function Sparkline({
  points,
  width = 80,
  height = 30,
  color = '#8884d8',
}: SparklineProps) {
  if (points.length === 0) {
    return <svg width={width} height={height} aria-label="sparkline" />;
  }

  if (points.length === 1) {
    // Single point: render a dot in the center
    const cx = width / 2;
    const cy = height / 2;
    return (
      <svg width={width} height={height} aria-label="sparkline">
        <circle cx={cx} cy={cy} r={2} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;

  // Map a value to SVG y coordinate (SVG y=0 is top; higher value = lower y)
  const toY = (value: number): number => {
    if (range === 0) return height / 2;
    return height - ((value - min) / range) * height;
  };

  const toX = (index: number): number =>
    (index / (points.length - 1)) * width;

  const polylinePoints = points
    .map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`)
    .join(' ');

  return (
    <svg width={width} height={height} aria-label="sparkline">
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}