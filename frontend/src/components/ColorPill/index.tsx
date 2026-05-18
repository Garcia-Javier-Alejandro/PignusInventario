import { VISUAL_COLORS } from '../../lib/visualColors'
import type { NormalizedVisualColor } from '../../types'

const COLOR_MAP = new Map(VISUAL_COLORS.map((c) => [c.value, c] as const))

interface Props {
  color: NormalizedVisualColor | string
  label: string
}

export default function ColorPill({ color, label }: Props) {
  const meta = COLOR_MAP.get(color as NormalizedVisualColor)
  if (!meta) return <span className="color-pill">{label}</span>
  return (
    <span
      className={`color-pill${color === 'WHITE' ? ' color-pill--has-border' : ''}${color === 'MULTICOLOR' ? ' color-pill--multicolor' : ''}`}
      style={{ background: meta.swatch, color: meta.onColor }}
    >
      {label}
    </span>
  )
}
