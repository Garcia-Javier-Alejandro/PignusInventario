import { VISUAL_COLORS } from '../../lib/visualColors'
import type { NormalizedVisualColor } from '../../types'

interface Props {
  value: NormalizedVisualColor | ''
  onChange: (next: NormalizedVisualColor | '') => void
  /** If true, clicking the selected swatch clears it. Used in filters. */
  allowClear?: boolean
}

export default function ColorPalette({ value, onChange, allowClear = false }: Props) {
  return (
    <div className="color-palette" role="listbox" aria-label="Color visual">
      {VISUAL_COLORS.map((c) => {
        const selected = value === c.value
        return (
          <button
            key={c.value}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={c.label}
            title={c.label}
            className={`color-swatch${selected ? ' color-swatch--selected' : ''}${c.value === 'WHITE' ? ' color-swatch--has-border' : ''}`}
            style={{ background: c.swatch }}
            onClick={() => onChange(allowClear && selected ? '' : c.value)}
          />
        )
      })}
    </div>
  )
}
