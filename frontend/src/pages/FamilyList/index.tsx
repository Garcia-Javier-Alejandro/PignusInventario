import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilies } from '../../hooks/useFamilies'
import ColorDot from '../../components/ColorDot'
import type { FilamentFamily } from '../../types'

type SortKey = 'color' | 'name' | 'stock' | 'threshold' | 'active'

const COMPARATORS: Record<SortKey, (a: FilamentFamily, b: FilamentFamily) => number> = {
  color: (a, b) => a.normalized_visual_color.localeCompare(b.normalized_visual_color),
  name: (a, b) =>
    a.brand.localeCompare(b.brand) ||
    a.material.localeCompare(b.material) ||
    a.brand_color_name.localeCompare(b.brand_color_name),
  stock: (a, b) => a.current_quantity - b.current_quantity,
  threshold: (a, b) => a.reorder_threshold - b.reorder_threshold,
  active: (a, b) => Number(b.active) - Number(a.active),
}

export default function FamilyList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: families, isLoading } = useFamilies({
    search: search || undefined,
    low_stock_only: lowStockOnly || undefined,
  })

  const sorted = useMemo(() => {
    if (!families || !sortBy) return families
    const arr = [...families].sort(COMPARATORS[sortBy])
    return sortDir === 'desc' ? arr.reverse() : arr
  }, [families, sortBy, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const sortArrow = (key: SortKey) => (sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')
  const sortableClass = (key: SortKey) => `th--sortable${sortBy === key ? (sortDir === 'asc' ? ' th--sort-asc' : ' th--sort-desc') : ''}`

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">Inventario</span>
        <span className="toolbar-right">
          <button className="btn btn--primary btn--xs" onClick={() => navigate('/families/new')}>
            + Nuevo
          </button>
        </span>
      </div>

      {isLoading && <div className="main-loading"><span className="spinner" /></div>}

      {sorted && (
        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th className={sortableClass('color')} onClick={() => toggleSort('color')} title="Ordenar por color">
                  <ColorDot color="MULTICOLOR" />{sortArrow('color')}
                </th>
                <th className={sortableClass('name')} onClick={() => toggleSort('name')}>Filamento{sortArrow('name')}</th>
                <th className={sortableClass('stock')} onClick={() => toggleSort('stock')}>Stock{sortArrow('stock')}</th>
                <th className={sortableClass('threshold')} onClick={() => toggleSort('threshold')}>Umbral{sortArrow('threshold')}</th>
                <th className={sortableClass('active')} onClick={() => toggleSort('active')}>Activo{sortArrow('active')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((f) => (
                <tr
                  key={f.id}
                  className={f.is_low_stock ? 'row--low-stock' : ''}
                  onClick={() => navigate(`/families/${f.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td><ColorDot color={f.normalized_visual_color} /></td>
                  <td>
                    <div className="family-name">{f.brand} {f.material}</div>
                    <div className="family-color">{f.brand_color_name}</div>
                  </td>
                  <td style={{ color: f.is_low_stock ? 'var(--err)' : undefined, fontWeight: 'var(--weight-semi)' }}>
                    {f.current_quantity}
                  </td>
                  <td>{f.reorder_threshold}</td>
                  <td style={{ color: f.active ? undefined : 'var(--ink-3)' }}>
                    {f.active ? 'Sí' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted?.length === 0 && !isLoading && (
        <p className="empty-state">No hay filamentos. <button className="link-btn" onClick={() => navigate('/families/new')}>Crear el primero</button></p>
      )}

      <div className="family-filters-bottom">
        <input
          type="search"
          placeholder="Buscar marca, material, color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`btn btn--xs ${lowStockOnly ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >Stock bajo</button>
      </div>
    </div>
  )
}
