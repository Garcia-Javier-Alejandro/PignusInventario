import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useFamilyById, usePatchFamily } from '../../hooks/useFamilies'
import { useMovements, useReceive, useConsume } from '../../hooks/useMovements'
import { listBarcodes } from '../../api/barcode'
import FamilyDeleteModal from '../../components/FamilyDeleteModal'
import FamilyEditModal from '../../components/FamilyEditModal'
import ManualAdjustModal from '../../components/ManualAdjustModal'
import AlternativesList from '../../components/AlternativesList'
import { DeleteIcon, EditIcon } from '../../components/icons'
import { VISUAL_COLORS } from '../../lib/visualColors'
import type { FilamentFamily, NormalizedVisualColor } from '../../types'

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Recibido',
  CONSUME_OPEN: 'Consumido',
  MANUAL_ADJUSTMENT: 'Ajuste',
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  // Staged edits — nothing commits until the user taps Guardar.
  const [pendingDelta, setPendingDelta] = useState(0)
  const [pendingUmbral, setPendingUmbral] = useState<number | null>(null)
  const [pendingActive, setPendingActive] = useState<boolean | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  // Effective (preview) values combining the saved family + pending edits.
  const effectiveStock = family.current_quantity + pendingDelta
  const effectiveUmbral = pendingUmbral ?? family.reorder_threshold
  const effectiveActive = pendingActive ?? family.active
  const previewLowStock = effectiveActive && effectiveStock <= effectiveUmbral

  const umbralDirty = pendingUmbral !== null && pendingUmbral !== family.reorder_threshold
  const activeDirty = pendingActive !== null && pendingActive !== family.active
  const stockDirty = pendingDelta !== 0
  const dirty = stockDirty || umbralDirty || activeDirty
  const saving = patch.isPending || receive.isPending || consume.isPending

  const handleQuickIn = () => {
    if (!primaryBarcode) return
    setPendingDelta((d) => d + 1)
  }
  const handleQuickOut = () => {
    if (!primaryBarcode) return
    setPendingDelta((d) => (effectiveStock - 1 < 0 ? d : d - 1))
  }

  const handleUmbralChange = (next: number) => {
    if (next < 0) return
    setPendingUmbral(next === family.reorder_threshold ? null : next)
  }
  const handleActiveToggle = (next: boolean) => {
    setPendingActive(next === family.active ? null : next)
  }

  const resetPending = () => {
    setPendingDelta(0)
    setPendingUmbral(null)
    setPendingActive(null)
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaveError(null)
    try {
      const patchBody: { reorder_threshold?: number; active?: boolean } = {}
      if (umbralDirty) patchBody.reorder_threshold = effectiveUmbral
      if (activeDirty) patchBody.active = effectiveActive
      if (Object.keys(patchBody).length > 0) {
        await patch.mutateAsync({ id: family.id, body: patchBody })
      }
      if (stockDirty && primaryBarcode) {
        if (pendingDelta > 0) {
          await receive.mutateAsync({ barcode: primaryBarcode, quantity: pendingDelta })
        } else {
          await consume.mutateAsync({ barcode: primaryBarcode, quantity: -pendingDelta })
        }
      }
      resetPending()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  return (
    <div className="flow-page detail-page">
      <DetailHero
        family={family}
        swatch={visualMeta?.swatch}
        onColor={visualMeta?.onColor ?? '#1c1814'}
        previewLowStock={previewLowStock}
      />

      <div className="detail-stock-card">
        <div className="detail-stock-card__main">
          <div className="kpi-card__eyebrow">Stock actual</div>
          <div className="detail-stock-card__value">
            <span
              className={`kpi-card__value${stockDirty ? ' detail-stock-card__value--pending' : ''}`}
              style={{ color: previewLowStock ? 'var(--err)' : undefined }}
            >
              {effectiveStock}
            </span>
            <span className="detail-stock-card__unit">
              rollo{effectiveStock === 1 ? '' : 's'}
            </span>
            {stockDirty && (
              <span className="detail-pending-badge">
                {pendingDelta > 0 ? `+${pendingDelta}` : pendingDelta} pendiente
              </span>
            )}
          </div>
        </div>
        <div className="detail-stock-card__actions">
          <button
            type="button"
            className="quick-stock-btn quick-stock-btn--in"
            onClick={handleQuickIn}
            disabled={!canQuickMove || saving}
            title={canQuickMove ? 'Ingresar 1 rollo (pendiente)' : 'Agregue un código de barras primero'}
            aria-label="Ingresar 1 rollo"
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            className="quick-stock-btn quick-stock-btn--out"
            onClick={handleQuickOut}
            disabled={!canQuickMove || effectiveStock <= 0 || saving}
            title={canQuickMove ? 'Consumir 1 rollo (pendiente)' : 'Agregue un código de barras primero'}
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
        <UmbralRow
          value={effectiveUmbral}
          dirty={umbralDirty}
          original={family.reorder_threshold}
          onChange={handleUmbralChange}
          disabled={saving}
        />
        <ActiveRow
          value={effectiveActive}
          dirty={activeDirty}
          original={family.active}
          onChange={handleActiveToggle}
          disabled={saving}
          last
        />
      </div>

      {previewLowStock && (
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

      <div className="detail-secondary-actions">
        <button
          type="button"
          className="btn btn--ghost icon-btn-row"
          onClick={() => setShowEdit(true)}
          disabled={saving}
        >
          <EditIcon /> Editar detalles
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowAdjust(true)}
          disabled={saving || dirty}
          title={dirty ? 'Guardá los cambios pendientes antes de hacer un ajuste' : 'Ajuste manual con motivo'}
        >
          Ajuste manual
        </button>
      </div>

      <button
        type="button"
        className="btn-eliminar"
        onClick={() => setShowDelete(true)}
        disabled={saving}
      >
        <DeleteIcon /> Eliminar filamento
      </button>

      {dirty && (
        <PendingChangesBar
          pendingDelta={pendingDelta}
          umbralFrom={umbralDirty ? family.reorder_threshold : null}
          umbralTo={umbralDirty ? effectiveUmbral : null}
          activeChange={activeDirty ? (effectiveActive ? 'activado' : 'desactivado') : null}
          onSave={handleSave}
          onCancel={resetPending}
          saving={saving}
          error={saveError}
        />
      )}

      {showDelete && (
        <FamilyDeleteModal
          family={family}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/families')}
        />
      )}

      {showEdit && (
        <FamilyEditModal
          family={family}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showAdjust && (
        <ManualAdjustModal
          family={family}
          onClose={() => setShowAdjust(false)}
        />
      )}
    </div>
  )
}

function DetailHero({ family, swatch, onColor, previewLowStock }: {
  family: FilamentFamily
  swatch?: string
  onColor: string
  previewLowStock: boolean
}) {
  return (
    <div className="detail-hero">
      <div className="detail-hero__image" style={{ background: swatch ?? '#ddd' }}>
        <div className="detail-hero__shade" />
        <FilamentSpoolSvg stroke={onColor} />
        {previewLowStock && (
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
  // Literal spool seen with its axle horizontal: two flanges as vertical
  // ellipses on left and right, connected top and bottom to suggest the
  // outer cylinder of wound filament, plus interior horizontal lines that
  // read as the wound layers themselves.
  return (
    <svg
      width="110"
      height="80"
      viewBox="0 0 100 80"
      fill="none"
      aria-hidden="true"
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Flanges */}
      <ellipse cx="22" cy="40" rx="8" ry="30" stroke={stroke} strokeOpacity={0.55} strokeWidth="1.8" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="78" cy="40" rx="8" ry="30" stroke={stroke} strokeOpacity={0.55} strokeWidth="1.8" fill="rgba(255,255,255,0.12)" />
      {/* Outer cylinder of wound filament — top and bottom edges between the flanges */}
      <line x1="22" y1="10" x2="78" y2="10" stroke={stroke} strokeOpacity={0.55} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="70" x2="78" y2="70" stroke={stroke} strokeOpacity={0.55} strokeWidth="1.8" strokeLinecap="round" />
      {/* Wound-layer texture */}
      <line x1="24" y1="22" x2="76" y2="22" stroke={stroke} strokeOpacity={0.35} strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="32" x2="76" y2="32" stroke={stroke} strokeOpacity={0.35} strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="42" x2="76" y2="42" stroke={stroke} strokeOpacity={0.35} strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="52" x2="76" y2="52" stroke={stroke} strokeOpacity={0.35} strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="62" x2="76" y2="62" stroke={stroke} strokeOpacity={0.35} strokeWidth="1" strokeLinecap="round" />
      {/* Hub dot on each flange, suggesting the centre hole */}
      <ellipse cx="22" cy="40" rx="2.5" ry="4" stroke={stroke} strokeOpacity={0.6} strokeWidth="1.2" fill={stroke} fillOpacity={0.1} />
      <ellipse cx="78" cy="40" rx="2.5" ry="4" stroke={stroke} strokeOpacity={0.6} strokeWidth="1.2" fill={stroke} fillOpacity={0.1} />
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

function UmbralRow({ value, dirty, original, onChange, disabled }: {
  value: number; dirty: boolean; original: number; onChange: (n: number) => void; disabled?: boolean
}) {
  return (
    <div className="kv-row">
      <span className="kv-row__label">
        Umbral mínimo
        {dirty && <span className="detail-pending-tag"> {original} → {value}</span>}
      </span>
      <div className={`umbral-stepper${dirty ? ' umbral-stepper--pending' : ''}`}>
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

function ActiveRow({ value, dirty, onChange, disabled, last }: {
  value: boolean; dirty: boolean; original: boolean; onChange: (v: boolean) => void; disabled?: boolean; last?: boolean
}) {
  return (
    <div className={`kv-row${last ? ' kv-row--last' : ''}`}>
      <span className="kv-row__label">
        Activo
        {dirty && <span className="detail-pending-tag"> ({value ? 'activado' : 'desactivado'} pendiente)</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`active-toggle${value ? ' active-toggle--on' : ''}${dirty ? ' active-toggle--pending' : ''}`}
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

function PendingChangesBar({ pendingDelta, umbralFrom, umbralTo, activeChange, onSave, onCancel, saving, error }: {
  pendingDelta: number
  umbralFrom: number | null
  umbralTo: number | null
  activeChange: 'activado' | 'desactivado' | null
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const parts: string[] = []
  if (pendingDelta !== 0) {
    parts.push(pendingDelta > 0 ? `Ingresar ${pendingDelta}` : `Consumir ${-pendingDelta}`)
  }
  if (umbralFrom !== null) parts.push(`Umbral ${umbralFrom} → ${umbralTo}`)
  if (activeChange) parts.push(activeChange === 'activado' ? 'Activar' : 'Desactivar')

  return (
    <div className="pending-bar" role="region" aria-label="Cambios sin guardar">
      <div className="pending-bar__head">
        <span className="pending-bar__title">Cambios sin guardar</span>
        <span className="pending-bar__summary">{parts.join(' · ')}</span>
      </div>
      {error && <p className="pending-bar__error">{error}</p>}
      <div className="pending-bar__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary btn--expand" onClick={onSave} disabled={saving}>
          {saving ? <span className="spinner" /> : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// Suppress unused-vars warning for the prop ActiveRow declares but uses indirectly.
type _UnusedActiveRowProps = Parameters<typeof ActiveRow>[0]['original']
void (null as unknown as _UnusedActiveRowProps)
type _UnusedNormalizedVisualColor = NormalizedVisualColor
void (null as unknown as _UnusedNormalizedVisualColor)
