import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ImportModal from '../../components/ImportModal'
import WipeAllModal from '../../components/WipeAllModal'
import WipeMovementsModal from '../../components/WipeMovementsModal'
import { clearInventoryCache } from '../../api/admin'
import ColorDot from '../../components/ColorDot'
import { formatBuildLabel, forceAppUpdate } from '../../lib/buildInfo'
import type { InventoryMovement } from '../../types'

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Ingreso',
  CONSUME_OPEN: 'Consumo',
  MANUAL_ADJUSTMENT: 'Ajuste',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useDashboard()
  const [showImport, setShowImport] = useState(false)
  const [showWipe, setShowWipe] = useState(false)
  const [showWipeMovements, setShowWipeMovements] = useState(false)
  const qc = useQueryClient()
  const clearCache = useMutation({
    mutationFn: clearInventoryCache,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>

  return (
    <div className="dashboard-page">
      {isError && (
        <div className="main-error" style={{ marginBottom: 'var(--space-4)' }}>
          Error al cargar el dashboard
        </div>
      )}

      <HeroLowStockCard
        lowCount={data?.low_stock_count ?? 0}
        totalActive={data?.total_families ?? 0}
      />

      <div className="mini-kpi-row">
        <MiniKpi label="Stock total" value={data?.total_stock} unit="kg" />
        <MiniKpi label="Consumo / mes" value={data?.consumed_this_month} unit="kg" />
        <MiniKpi label="Ingresos / mes" value={data?.received_this_month} unit="kg" />
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section__head">
          <h2 className="dashboard-section__title">Movimientos recientes</h2>
          <button type="button" className="link-btn" onClick={() => navigate('/movements')}>
            Ver todos
          </button>
        </div>
        {data && data.recent_movements.length === 0 && (
          <p className="empty-state">Sin movimientos</p>
        )}
        {data && data.recent_movements.length > 0 && (
          <div className="movement-list">
            {data.recent_movements.slice(0, 6).map((m) => (
              <RecentMovementRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      {/* Always-visible build label outside any styled container so the
          hash stays readable even when a nested layout breaks. */}
      <div style={{
        fontSize: 11,
        color: 'var(--ink-3)',
        textAlign: 'center',
        margin: '24px 0 4px',
        fontFamily: 'ui-monospace, monospace',
      }}>
        Build {formatBuildLabel()}
      </div>

      <details className="debug-section">
        <summary>Aux Debug Tools</summary>
        {/* Inline styles override the cascade: PignusUI's .debug-body ships
            as a horizontal row and an external-stylesheet override loses on
            partial-cache states. See feedback_pignusui_override_collision. */}
        <div
          className="debug-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 8,
            paddingTop: 12,
            marginTop: 0,
          }}
        >
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowImport(true)}
            style={{ width: '100%' }}
          >
            Importar inventario inicial
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={forceAppUpdate}
            style={{ width: '100%' }}
          >
            Forzar actualización
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => clearCache.mutate()}
            disabled={clearCache.isPending}
            style={{ width: '100%' }}
          >
            {clearCache.isPending ? <span className="spinner" /> : 'Limpiar caché KV'}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setShowWipeMovements(true)}
            style={{ width: '100%' }}
          >
            Borrar movimientos
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setShowWipe(true)}
            style={{ width: '100%' }}
          >
            Borrar todo el inventario
          </button>
        </div>
      </details>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showWipe && <WipeAllModal onClose={() => setShowWipe(false)} />}
      {showWipeMovements && <WipeMovementsModal onClose={() => setShowWipeMovements(false)} />}
    </div>
  )
}

function HeroLowStockCard({ lowCount, totalActive }: { lowCount: number; totalActive: number }) {
  return (
    <div className="hero-card">
      <div className="hero-card__icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 3l9 16H2L11 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M11 9v4M11 16h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </div>
      <div className="hero-card__body">
        <div className="kpi-card__eyebrow">Insumos con stock bajo</div>
        <div className="hero-card__value-row">
          <span className="kpi-card__value hero-card__value">{lowCount}</span>
          <span className="hero-card__hint">de {totalActive} activos</span>
        </div>
      </div>
    </div>
  )
}

function MiniKpi({ label, value, unit }: { label: string; value?: number; unit?: string }) {
  return (
    <div className="mini-kpi">
      <div className="kpi-card__eyebrow">{label}</div>
      <div className="mini-kpi__value-row">
        <span className="kpi-card__value mini-kpi__value">{value ?? '—'}</span>
        {unit && <span className="mini-kpi__unit">{unit}</span>}
      </div>
    </div>
  )
}

function RecentMovementRow({ m }: { m: InventoryMovement }) {
  const isIn = m.movement_type === 'RECEIVE_STOCK'
  const isAdj = m.movement_type === 'MANUAL_ADJUSTMENT'
  const action = MOVEMENT_LABELS[m.movement_type] ?? m.movement_type
  return (
    <div className="movement-row">
      <span className="movement-row__color">
        <ColorDot color={m.normalized_visual_color} />
      </span>
      <div className={`movement-row__icon ${isIn ? 'is-in' : isAdj ? 'is-adjust' : 'is-out'}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          {isIn ? (
            <path d="M7 11V3m0 0L3 7m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          ) : isAdj ? (
            <text x="7" y="10" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">±</text>
          ) : (
            <path d="M7 3v8m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
      <div className="movement-row__body">
        <div className="movement-row__label">
          {action} · {m.brand} {m.material} {m.brand_color_name}
        </div>
        <div className="movement-row__when">
          {new Date(m.created_at).toLocaleDateString('es-AR')}
        </div>
      </div>
      <div className={`movement-row__delta ${m.quantity_delta > 0 ? 'is-pos' : 'is-neg'}`}>
        {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
      </div>
    </div>
  )
}
