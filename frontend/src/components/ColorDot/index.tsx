import { VISUAL_COLORS } from '../../lib/visualColors'
import type { NormalizedVisualColor } from '../../types'

const SWATCH_MAP = new Map(VISUAL_COLORS.map((c) => [c.value, c.swatch] as const))

export default function ColorDot({ color }: { color?: NormalizedVisualColor | string | null }) {
  const swatch = color ? SWATCH_MAP.get(color as NormalizedVisualColor) : undefined
  if (!swatch) {
    return <span className="color-dot color-dot--empty" aria-label="sin color" title="Sin color" />
  }
  const cls = `color-dot${color === 'WHITE' ? ' color-dot--has-border' : ''}`
  return <span className={cls} style={{ background: swatch }} aria-label={String(color)} title={String(color)} />
}
