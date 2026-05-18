import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilies } from '../../hooks/useFamilies'
import { VISUAL_COLORS } from '../../lib/visualColors'
import type { FilamentFamily, NormalizedVisualColor } from '../../types'

type SortKey = 'brand' | 'material' | 'color'

const COMPARATORS: Record<SortKey, (a: FilamentFamily, b: FilamentFamily) => number> = {
  brand: (a, b) =>
    a.brand.localeCompare(b.brand) ||
    a.material.localeCompare(b.material) ||
    a.brand_color_name.localeCompare(b.brand_color_name),
  material: (a, b) =>
    a.material.localeCompare(b.material) ||
    a.brand.localeCompare(b.brand) ||
    a.brand_color_name.localeCompare(b.brand_color_name),
  color: (a, b) =>
    a.normalized_visual_color.localeCompare(b.normalized_visual_color) ||
    a.brand_color_name.localeCompare(b.brand_color_name),
}

const SWATCH_MAP = new Map(VISUAL_COLORS.map((c) => [c.value, c.swatch] as const))

export default function FamilyList() {
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const { data: families, isLoading } = useFamilies({
    low_stock_only: lowStockOnly || undefined,
  })

  const sorted = useMemo(() => {
    if (!families || !sortBy) return families
    return [...families].sort(COMPARATORS[sortBy])
  }, [families, sortBy])

  const lowStockCount = families?.filter((f) => f.is_low_stock).length ?? 0
  const total = families?.length ?? 0

  return (
    <div className="flow-page family-list-page">
      <div className="toolbar">
        <span className="toolbar-left">Inventario</span>
        <span className="toolbar-right">
          <button className="btn btn--primary btn--xs" onClick={() => navigate('/families/new')}>
            + Nuevo
          </button>
        </span>
      </div>

      <div className="family-filter-row">
        <span className="family-filter-row__label">Ordenar por</span>
        <SortPill label="Marca" active={sortBy === 'brand'} onClick={() => setSortBy(sortBy === 'brand' ? null : 'brand')} />
        <SortPill label="Material" active={sortBy === 'material'} onClick={() => setSortBy(sortBy === 'material' ? null : 'material')} />
        <SortPill label="Color" active={sortBy === 'color'} onClick={() => setSortBy(sortBy === 'color' ? null : 'color')} />
        <button
          type="button"
          className={`stock-bajo-pill${lowStockOnly ? ' stock-bajo-pill--active' : ''}`}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          <span>Stock bajo</span>
          {lowStockOnly && total > 0 && <span className="stock-bajo-pill__count">· {total}</span>}
          {!lowStockOnly && lowStockCount > 0 && <span className="stock-bajo-pill__count">· {lowStockCount}</span>}
        </button>
      </div>

      {isLoading && <div className="main-loading"><span className="spinner" /></div>}

      {sorted && sorted.length > 0 && (
        <div className="filament-card-list">
          {sorted.map((f) => (
            <FilamentCard key={f.id} family={f} onOpen={() => navigate(`/families/${f.id}`)} />
          ))}
        </div>
      )}

      {sorted?.length === 0 && !isLoading && (
        <p className="empty-state">
          {lowStockOnly
            ? 'No hay filamentos con stock bajo.'
            : <>No hay filamentos. <button className="link-btn" onClick={() => navigate('/families/new')}>Crear el primero</button></>}
        </p>
      )}
    </div>
  )
}

function SortPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`sort-pill${active ? ' sort-pill--active' : ''}`}
      onClick={onClick}
    >
      {label}
      {active && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
          <path d="M2 3l2.5 2.5L7 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function FilamentCard({ family: f, onOpen }: { family: FilamentFamily; onOpen: () => void }) {
  const swatch = SWATCH_MAP.get(f.normalized_visual_color as NormalizedVisualColor) ?? '#ddd'
  // Progress bar: stock vs threshold*2 so the bar reaches 100% at twice the
  // minimum, and is exactly half-full when stock == threshold.
  const denom = Math.max(f.reorder_threshold * 2, 1)
  const pct = Math.min(1, f.current_quantity / denom)
  const danger = f.is_low_stock

  return (
    <button type="button" className="filament-card" onClick={onOpen}>
      <span
        className={`filament-card__ball${f.normalized_visual_color === 'WHITE' ? ' filament-card__ball--has-border' : ''}`}
        style={{ background: swatch }}
        aria-hidden="true"
      />
      <div className="filament-card__body">
        <div className="filament-card__name">{f.brand} {f.material}</div>
        <div className="filament-card__variant">{f.brand_color_name}</div>
        <div className="filament-card__bar">
          <span
            className="filament-card__bar-fill"
            style={{
              width: `${pct * 100}%`,
              background: danger ? 'var(--err)' : 'var(--ok)',
            }}
          />
        </div>
      </div>
      <div className="filament-card__right">
        <div
          className="filament-card__stock"
          style={{ color: danger ? 'var(--err)' : 'var(--ink)' }}
        >
          {f.current_quantity}
        </div>
        <div className="filament-card__min">de {f.reorder_threshold} min</div>
      </div>
    </button>
  )
}
