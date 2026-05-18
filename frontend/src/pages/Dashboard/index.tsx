import { useMemo, useState } from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import ImportModal from '../../components/ImportModal'
import WipeAllModal from '../../components/WipeAllModal'
import ColorDot from '../../components/ColorDot'
import { formatBuildLabel, forceAppUpdate } from '../../lib/buildInfo'
import type { FilamentFamily, InventoryMovement } from '../../types'

type LowStockKey = 'color' | 'name' | 'stock' | 'threshold'
type ActivityKey = 'color' | 'name' | 'action' | 'delta'

const LOW_STOCK_CMP: Record<LowStockKey, (a: FilamentFamily, b: FilamentFamily) => number> = {
  color: (a, b) => a.normalized_visual_color.localeCompare(b.normalized_visual_color),
  name: (a, b) =>
    a.brand.localeCompare(b.brand) ||
    a.material.localeCompare(b.material) ||
    a.brand_color_name.localeCompare(b.brand_color_name),
  stock: (a, b) => a.current_quantity - b.current_quantity,
  threshold: (a, b) => a.reorder_threshold - b.reorder_threshold,
}

const ACTIVITY_CMP: Record<ActivityKey, (a: InventoryMovement, b: InventoryMovement) => number> = {
  color: (a, b) => (a.normalized_visual_color ?? '').localeCompare(b.normalized_visual_color ?? ''),
  name: (a, b) =>
    (a.brand ?? '').localeCompare(b.brand ?? '') ||
    (a.material ?? '').localeCompare(b.material ?? '') ||
    (a.brand_color_name ?? '').localeCompare(b.brand_color_name ?? ''),
  action: (a, b) => a.movement_type.localeCompare(b.movement_type),
  delta: (a, b) => a.quantity_delta - b.quantity_delta,
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard()
  const [showImport, setShowImport] = useState(false)
  const [showWipe, setShowWipe] = useState(false)

  const [lsSort, setLsSort] = useState<{ key: LowStockKey | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' })
  const [actSort, setActSort] = useState<{ key: ActivityKey | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' })

  const sortedLowStock = useMemo(() => {
    if (!data || !lsSort.key) return data?.low_stock
    const arr = [...data.low_stock].sort(LOW_STOCK_CMP[lsSort.key])
    return lsSort.dir === 'desc' ? arr.reverse() : arr
  }, [data, lsSort])

  const sortedActivity = useMemo(() => {
    if (!data || !actSort.key) return data?.recent_movements
    const arr = [...data.recent_movements].sort(ACTIVITY_CMP[actSort.key])
    return actSort.dir === 'desc' ? arr.reverse() : arr
  }, [data, actSort])

  const toggleLs = (key: LowStockKey) =>
    setLsSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const toggleAct = (key: ActivityKey) =>
    setActSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const lsThClass = (key: LowStockKey) =>
    `th--sortable${lsSort.key === key ? (lsSort.dir === 'asc' ? ' th--sort-asc' : ' th--sort-desc') : ''}`
  const actThClass = (key: ActivityKey) =>
    `th--sortable${actSort.key === key ? (actSort.dir === 'asc' ? ' th--sort-asc' : ' th--sort-desc') : ''}`

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>

  return (
    <div>
      {isError && (
        <div className="main-error" style={{ marginBottom: 'var(--space-4)' }}>
          Error al cargar el dashboard
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Insumos activos totales</div>
          <div className="kpi-card__value">{data?.total_families ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Insumos con stock bajo</div>
          <div className="kpi-card__value" style={{ color: data?.low_stock_count ? 'var(--err)' : undefined }}>
            {data?.low_stock_count ?? '—'}
          </div>
        </div>
      </div>

      {sortedLowStock && sortedLowStock.length > 0 && (
        <section className="dashboard-section">
          <h2 className="dashboard-section__title">Insumos con stock bajo</h2>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th className={lsThClass('color')} onClick={() => toggleLs('color')}><ColorDot color="MULTICOLOR" /></th>
                  <th className={lsThClass('name')} onClick={() => toggleLs('name')}>Filamento</th>
                  <th className={lsThClass('stock')} onClick={() => toggleLs('stock')}>Stock</th>
                  <th className={lsThClass('threshold')} onClick={() => toggleLs('threshold')}>Umbral</th>
                </tr>
              </thead>
              <tbody>
                {sortedLowStock.map((f) => (
                  <tr key={f.id}>
                    <td><ColorDot color={f.normalized_visual_color} /></td>
                    <td>
                      <div className="family-name">{f.brand} {f.material}</div>
                      <div className="family-color">{f.brand_color_name}</div>
                    </td>
                    <td style={{ color: 'var(--err)', fontWeight: 'var(--weight-semi)' }}>
                      {f.current_quantity}
                    </td>
                    <td>{f.reorder_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sortedActivity && sortedActivity.length > 0 && (
        <section className="dashboard-section">
          <h2 className="dashboard-section__title">Actividad reciente</h2>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th className={actThClass('color')} onClick={() => toggleAct('color')}><ColorDot color="MULTICOLOR" /></th>
                  <th className={actThClass('name')} onClick={() => toggleAct('name')}>Filamento</th>
                  <th className={actThClass('action')} onClick={() => toggleAct('action')}>Acción</th>
                  <th className={actThClass('delta')} onClick={() => toggleAct('delta')}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {sortedActivity.map((m) => (
                  <tr key={m.id}>
                    <td><ColorDot color={m.normalized_visual_color} /></td>
                    <td>
                      <div className="family-name">{m.brand} {m.material}</div>
                      <div className="family-color">{m.brand_color_name}</div>
                    </td>
                    <td>
                      <span className={`pill ${m.movement_type === 'RECEIVE_STOCK' ? 'pill--ok' : m.movement_type === 'CONSUME_OPEN' ? 'pill--pending' : ''}`}>
                        {m.movement_type === 'RECEIVE_STOCK' ? 'Recibido' : m.movement_type === 'CONSUME_OPEN' ? 'Consumido' : 'Ajuste'}
                      </span>
                    </td>
                    <td style={{ color: m.quantity_delta > 0 ? 'var(--ok)' : 'var(--err)' }}>
                      {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <details className="debug-section">
        <summary>Aux Debug Tools</summary>
        <div className="debug-body">
          <button type="button" className="btn btn--secondary" onClick={() => setShowImport(true)}>
            Importar inventario inicial
          </button>
          <button type="button" className="btn btn--secondary" onClick={forceAppUpdate}>
            Forzar actualización
          </button>
          <button type="button" className="btn btn--danger" onClick={() => setShowWipe(true)}>
            Borrar todo el inventario
          </button>
          <span className="debug-status">Build: <code>{formatBuildLabel()}</code></span>
        </div>
      </details>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showWipe && <WipeAllModal onClose={() => setShowWipe(false)} />}
    </div>
  )
}
