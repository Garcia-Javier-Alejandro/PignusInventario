interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[]
  height?: number
  ariaLabel?: string
  unit?: string
}

// "YYYY-MM-DD" → "DD/M"
function formatDateLabel(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`
}

function formatYLabel(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

export default function MiniLineChart({ points, height = 140, ariaLabel, unit }: Props) {
  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const rawMax = Math.max(...values)
  // Nice-round the axis ceiling to a multiple of 5 with a 5-unit floor so a
  // flat-zero series still draws a meaningful axis.
  const max = Math.max(Math.ceil(rawMax / 5) * 5, 5)
  const min = 0

  // ViewBox is stretched (preserveAspectRatio="none") to fill the plot column.
  // Gridlines sit at y=2/50/98 so the polyline doesn't get clipped against
  // the top/bottom edges and so the Y labels (which use the same 2px inset
  // via padding) align visually.
  const W = 320
  const H = 100
  const padTop = 2
  const padBottom = 2
  const usableH = H - padTop - padBottom

  const stepX = points.length > 1 ? W / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = padTop + usableH - ((p.value - min) / (max - min)) * usableH
    return [x, y] as const
  })

  const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  const midIndex = Math.floor((points.length - 1) / 2)
  const xLabels = [points[0].date, points[midIndex].date, points[points.length - 1].date]

  const yMid = max / 2
  const ySuffix = unit ? ` ${unit}` : ''

  return (
    <div className="chart-area" style={{ height }}>
      <div className="chart-area__y">
        <span>{formatYLabel(max)}{ySuffix}</span>
        <span>{formatYLabel(yMid)}</span>
        <span>{formatYLabel(min)}</span>
      </div>
      <div className="chart-area__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
        >
          <g stroke="var(--border)" strokeWidth="0.5" opacity="0.7">
            <line x1="0" y1={padTop} x2={W} y2={padTop} />
            <line x1="0" y1={padTop + usableH / 2} x2={W} y2={padTop + usableH / 2} />
            <line x1="0" y1={padTop + usableH} x2={W} y2={padTop + usableH} />
          </g>
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="chart-area__x">
        <span>{formatDateLabel(xLabels[0])}</span>
        <span>{formatDateLabel(xLabels[1])}</span>
        <span>{formatDateLabel(xLabels[2])}</span>
      </div>
    </div>
  )
}
