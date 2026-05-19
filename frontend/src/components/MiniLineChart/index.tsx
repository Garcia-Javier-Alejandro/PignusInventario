interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[]
  height?: number
  ariaLabel?: string
}

// Faded grid + a single blue line. Y scale is auto-fit to the series with a
// small headroom; if all values are zero we still draw a flat baseline rather
// than collapsing to nothing.
export default function MiniLineChart({ points, height = 140, ariaLabel }: Props) {
  if (points.length === 0) return null

  const W = 320
  const H = 100
  const padTop = 6
  const padBottom = 6
  const usableH = H - padTop - padBottom

  const values = points.map((p) => p.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const stepX = points.length > 1 ? W / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = padTop + usableH - ((p.value - min) / range) * usableH
    return [x, y] as const
  })

  const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <div className="chart-placeholder" style={{ height }}>
      <svg
        className="chart-placeholder__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <g stroke="var(--border)" strokeWidth="0.5" opacity="0.7">
          <line x1="0" y1="25" x2={W} y2="25" />
          <line x1="0" y1="50" x2={W} y2="50" />
          <line x1="0" y1="75" x2={W} y2="75" />
        </g>
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
