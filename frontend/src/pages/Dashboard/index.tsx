import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import { useFamilies } from '../../hooks/useFamilies'
import { useTotalStockHistory, useFamilyStockHistory, useMonthlyHistory } from '../../hooks/useHistory'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ImportModal from '../../components/ImportModal'
import WipeAllModal from '../../components/WipeAllModal'
import WipeMovementsModal from '../../components/WipeMovementsModal'
import MiniLineChart from '../../components/MiniLineChart'
import MonthlyBarChart from '../../components/MonthlyBarChart'
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
        <MiniKpi label="Consumo / mes" value={data?.consumed_this_month} unit="kg" />
        <MiniKpi label="Ingresos / mes" value={data?.received_this_month} unit="kg" />
      </div>

      <MonthlyTrendsCard />

      <TotalStockChartCard totalStock={data?.total_stock} />

      <StockPerFamilyChartCard />

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

function ChartPlaceholder({ label = 'Próximamente' }: { label?: string }) {
  return (
    <div className="chart-placeholder">
      <svg
        className="chart-placeholder__svg"
        viewBox="0 0 320 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g stroke="var(--border)" strokeWidth="0.5" opacity="0.7">
          <line x1="0" y1="25" x2="320" y2="25" />
          <line x1="0" y1="50" x2="320" y2="50" />
          <line x1="0" y1="75" x2="320" y2="75" />
        </g>
      </svg>
      <span className="chart-placeholder__overlay">{label}</span>
    </div>
  )
}

const DAY_RANGES = [30, 90, 365] as const
type DayRange = typeof DAY_RANGES[number]

function RangePicker({ value, onChange }: { value: DayRange; onChange: (v: DayRange) => void }) {
  return (
    <div className="chart-range-picker">
      {DAY_RANGES.map((d) => (
        <button
          key={d}
          type="button"
          className={`chart-range-picker__btn${value === d ? ' is-active' : ''}`}
          onClick={() => onChange(d)}
        >
          {d}d
        </button>
      ))}
    </div>
  )
}

function MonthlyTrendsCard() {
  const { data, isLoading, isError } = useMonthlyHistory(6)

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div className="kpi-card__eyebrow">Tendencia mensual</div>
      </div>
      {isLoading ? (
        <ChartPlaceholder label="Cargando…" />
      ) : isError ? (
        <ChartPlaceholder label="Sin datos" />
      ) : (
        <MonthlyBarChart series={data?.series ?? []} />
      )}
    </div>
  )
}

function TotalStockChartCard({ totalStock }: { totalStock?: number }) {
  const [days, setDays] = useState<DayRange>(30)
  const { data, isLoading, isError } = useTotalStockHistory(days)
  const points = useMemo(
    () => (data?.series ?? []).map((p) => ({ date: p.date, value: p.total_stock })),
    [data],
  )

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div className="kpi-card__eyebrow">Stock total</div>
        <div className="chart-card__corner">
          <span className="chart-card__corner-value">{totalStock ?? '—'} kg</span>
          <span className="chart-card__corner-label">Stock actual</span>
        </div>
      </div>
      <RangePicker value={days} onChange={setDays} />
      {isLoading ? (
        <ChartPlaceholder label="Cargando…" />
      ) : isError ? (
        <ChartPlaceholder label="Sin datos" />
      ) : (
        <MiniLineChart points={points} ariaLabel={`Stock total en los últimos ${days} días`} />
      )}
    </div>
  )
}

function StockPerFamilyChartCard() {
  const { data: families } = useFamilies()
  const options = useMemo(
    () =>
      (families ?? []).slice().sort((a, b) =>
        a.brand.localeCompare(b.brand, 'es') ||
        a.material.localeCompare(b.material, 'es') ||
        a.brand_color_name.localeCompare(b.brand_color_name, 'es'),
      ),
    [families],
  )
  const [selected, setSelected] = useState<string>('')
  const [days, setDays] = useState<DayRange>(30)
  const { data, isLoading, isError } = useFamilyStockHistory(selected, days)
  const points = useMemo(
    () => (data?.series ?? []).map((p) => ({ date: p.date, value: p.stock })),
    [data],
  )

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div className="kpi-card__eyebrow">Stock por filamento</div>
        <select
          className="chart-card__corner-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Seleccionar filamento"
        >
          <option value="" disabled>Seleccionar filamento…</option>
          {options.map((f) => (
            <option key={f.id} value={f.id}>
              {f.brand} {f.material} {f.brand_color_name}
            </option>
          ))}
        </select>
      </div>
      <RangePicker value={days} onChange={setDays} />
      {!selected ? (
        <ChartPlaceholder label="Elegí un filamento" />
      ) : isLoading ? (
        <ChartPlaceholder label="Cargando…" />
      ) : isError ? (
        <ChartPlaceholder label="Sin datos" />
      ) : (
        <MiniLineChart points={points} ariaLabel={`Stock de filamento en los últimos ${days} días`} />
      )}
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
