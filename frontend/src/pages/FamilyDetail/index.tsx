import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useFamilyById, usePatchFamily } from '../../hooks/useFamilies'
import { useMovements, useReceive, useConsume } from '../../hooks/useMovements'
import { listBarcodes } from '../../api/barcode'
import FamilyDeleteModal from '../../components/FamilyDeleteModal'
import AlternativesList from '../../components/AlternativesList'
import { DeleteIcon } from '../../components/icons'
import { VISUAL_COLORS } from '../../lib/visualColors'
import type { FilamentFamily } from '../../types'

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Recibido',
  CONSUME_OPEN: 'Consumido',
  MANUAL_ADJUSTMENT: 'Ajuste',
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)

  const { data: family, isLoading } = useFamilyById(id!)
  const { data: movementsData } = useMovements({ filament_family_id: id, limit: 6 })
  const { data: barcodesData } = useQuery({ queryKey: ['barcodes'], queryFn: listBarcodes })
  const patch = usePatchFamily()
  const receive = useReceive()
  const consume = useConsume()

  const visualMeta = useMemo(
    () => VISUAL_COLORS.find((c) => c.value === family?.normalized_visual_color),
    [family],
  )

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>
  if (!family) return <div className="main-error">Filamento no encontrado</div>

  const familyBarcodes = barcodesData?.mappings.filter((m) => m.filament_family_id === family.id) ?? []
  const primaryBarcode = familyBarcodes[0]?.barcode
  const canQuickMove = Boolean(primaryBarcode)

  const handleQuickIn = () => {
    if (!primaryBarcode) return
    receive.mutate({ barcode: primaryBarcode, quantity: 1 })
  }
  const handleQuickOut = () => {
    if (!primaryBarcode || family.current_quantity <= 0) return
    consume.mutate({ barcode: primaryBarcode, quantity: 1 })
  }

  const handleUmbralChange = (next: number) => {
    if (next < 0 || next === family.reorder_threshold) return
    patch.mutate({ id: family.id, body: { reorder_threshold: next } })
  }
  const handleActiveToggle = (next: boolean) => {
    if (next === family.active) return
    patch.mutate({ id: family.id, body: { active: next } })
  }

  return (
    <div className="flow-page detail-page">
      <DetailHero family={family} swatch={visualMeta?.swatch} onColor={visualMeta?.onColor ?? '#1c1814'} />

      <div className="detail-stock-card">
        <div className="detail-stock-card__main">
          <div className="kpi-card__eyebrow">Stock actual</div>
          <div className="detail-stock-card__value">
            <span
              className="kpi-card__value"
              style={{ color: family.is_low_stock ? 'var(--err)' : undefined }}
            >
              {family.current_quantity}
            </span>
            <span className="detail-stock-card__unit">
              rollo{family.current_quantity === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="detail-stock-card__actions">
          <button
            type="button"
            className="quick-stock-btn quick-stock-btn--in"
            onClick={handleQuickIn}
            disabled={!canQuickMove || receive.isPending}
            title={canQuickMove ? 'Ingresar 1 rollo' : 'Agregue un código de barras primero'}
            aria-label="Ingresar 1 rollo"
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            className="quick-stock-btn quick-stock-btn--out"
            onClick={handleQuickOut}
            disabled={!canQuickMove || family.current_quantity <= 0 || consume.isPending}
            title={canQuickMove ? 'Consumir 1 rollo' : 'Agregue un código de barras primero'}
            aria-label="Consumir 1 rollo"
          >
            <ArrowDownIcon />
          </button>
        </div>
      </div>

      <div className="detail-kv-card">
        <KVRow label="Marca" value={family.brand} first />
        <KVRow label="Material" value={family.material} />
        <KVRow label="Color" value={family.brand_color_name} />
        <KVRow
          label={familyBarcodes.length === 1 ? 'Código de barras' : 'Códigos de barras'}
          value={familyBarcodes.length === 0
            ? <span style={{ color: 'var(--ink-3)' }}>Ninguno</span>
            : <span className="kv-row__codes">{familyBarcodes.map((b) => <code key={b.barcode}>{b.barcode}</code>)}</span>}
        />
        <UmbralRow value={family.reorder_threshold} onChange={handleUmbralChange} disabled={patch.isPending} />
        <ActiveRow value={family.active} onChange={handleActiveToggle} disabled={patch.isPending} last />
      </div>

      {family.is_low_stock && (
        <AlternativesList sourceId={family.id} enabled />
      )}

      <section className="dashboard-section">
        <h2 className="dashboard-section__title">Movimientos recientes</h2>
        {movementsData && movementsData.movements.length === 0 && (
          <p className="empty-state">Sin movimientos</p>
        )}
        {movementsData && movementsData.movements.length > 0 && (
          <div className="movement-list">
            {movementsData.movements.map((m) => (
              <MovementListItem
                key={m.id}
                type={m.movement_type}
                label={MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                delta={m.quantity_delta}
                notes={m.notes}
                when={new Date(m.created_at).toLocaleDateString('es-AR')}
              />
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        className="btn-eliminar"
        onClick={() => setShowDelete(true)}
      >
        <DeleteIcon /> Eliminar filamento
      </button>

      {showDelete && (
        <FamilyDeleteModal
          family={family}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/families')}
        />
      )}
    </div>
  )
}

function DetailHero({ family, swatch, onColor }: { family: FilamentFamily; swatch?: string; onColor: string }) {
  return (
    <div className="detail-hero">
      <div className="detail-hero__image" style={{ background: swatch ?? '#ddd' }}>
        <div className="detail-hero__shade" />
        <FilamentSpoolSvg stroke={onColor} />
        {family.is_low_stock && (
          <span className="detail-hero__alert">STOCK BAJO</span>
        )}
      </div>
      <div className="detail-hero__caption">
        <h1 className="detail-title">{family.brand} {family.material}</h1>
        <p className="detail-subtitle">{family.brand_color_name} · {family.material}</p>
      </div>
    </div>
  )
}

function FilamentSpoolSvg({ stroke = '#1c1814' }: { stroke?: string }) {
  return (
    <svg
      width="92"
      height="72"
      viewBox="0 0 78 62"
      fill="none"
      aria-hidden="true"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <ellipse cx="39" cy="31" rx="30" ry="22" stroke={stroke} strokeOpacity={0.3} strokeWidth="1.6" />
      <ellipse cx="39" cy="31" rx="10" ry="8" stroke={stroke} strokeOpacity={0.45} strokeWidth="1.6" />
      <path d="M9 31 Q24 38 39 38 Q54 38 69 31" stroke={stroke} strokeOpacity={0.3} strokeWidth="1.6" fill="none" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3m0 0L4 7m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KVRow({ label, value, first }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <div className={`kv-row${first ? ' kv-row--first' : ''}`}>
      <span className="kv-row__label">{label}</span>
      <span className="kv-row__value">{value}</span>
    </div>
  )
}

function UmbralRow({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="kv-row">
      <span className="kv-row__label">Umbral mínimo</span>
      <div className="umbral-stepper">
        <button
          type="button"
          className="umbral-stepper__btn"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= 0}
          aria-label="Disminuir umbral"
        >−</button>
        <div className="umbral-stepper__value">{value}</div>
        <button
          type="button"
          className="umbral-stepper__btn"
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          aria-label="Aumentar umbral"
        >+</button>
      </div>
      <span className="kv-row__suffix">rollos</span>
    </div>
  )
}

function ActiveRow({ value, onChange, disabled, last }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  return (
    <div className={`kv-row${last ? ' kv-row--last' : ''}`}>
      <span className="kv-row__label">Activo</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`active-toggle${value ? ' active-toggle--on' : ''}`}
        onClick={() => onChange(!value)}
        disabled={disabled}
      >
        <span className="active-toggle__thumb" />
      </button>
    </div>
  )
}

function MovementListItem({ type, label, delta, notes, when }: {
  type: string; label: string; delta: number; notes: string | null; when: string;
}) {
  const isIn = type === 'RECEIVE_STOCK'
  const isAdjustment = type === 'MANUAL_ADJUSTMENT'
  return (
    <div className="movement-row">
      <div className={`movement-row__icon ${isIn ? 'is-in' : isAdjustment ? 'is-adjust' : 'is-out'}`}>
        {isIn ? <ArrowUpIcon /> : isAdjustment ? <span style={{ fontWeight: 700, fontSize: 12 }}>±</span> : <ArrowDownIcon />}
      </div>
      <div className="movement-row__body">
        <div className="movement-row__label">{label}{notes ? ` · ${notes}` : ''}</div>
        <div className="movement-row__when">{when}</div>
      </div>
      <div className={`movement-row__delta ${delta > 0 ? 'is-pos' : 'is-neg'}`}>
        {delta > 0 ? '+' : ''}{delta}
      </div>
    </div>
  )
}
