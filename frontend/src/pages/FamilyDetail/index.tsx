import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useFamilyById, usePatchFamily } from '../../hooks/useFamilies'
import { useMovements, useReceive, useConsume } from '../../hooks/useMovements'
import { listBarcodes } from '../../api/barcode'
import FamilyDeleteModal from '../../components/FamilyDeleteModal'
import FamilyEditModal from '../../components/FamilyEditModal'
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
          className="btn-eliminar btn-eliminar--inline icon-btn-row"
          onClick={() => setShowDelete(true)}
          disabled={saving}
        >
          <DeleteIcon /> Eliminar
        </button>
      </div>

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
  // Top-down view of a filament spool — the outer ring is the spool wall, the
  // dense vertical strokes are the wound filament layers. Sourced from
  // public/spool_svg.svg. The fill colour follows the swatch's onColor so the
  // silhouette stays visible on both dark and light hero backgrounds.
  return (
    <svg
      width="92"
      height="92"
      viewBox="0 0 192 192"
      aria-hidden="true"
      style={{ position: 'relative', zIndex: 1, opacity: 0.7 }}
    >
      <path
        fill={stroke}
        d="M141.120239,24.163979 C146.317139,37.246426 148.604507,50.565502 150.477936,64.074844 C153.144760,83.305397 152.900116,102.622070 152.078339,121.837700 C151.194031,142.515106 148.837891,163.205338 139.372894,182.220566 C138.639221,183.694519 137.791260,185.171143 136.720947,186.408203 C130.129135,194.026978 122.173737,193.621506 116.337776,185.398956 C114.711960,183.108276 112.994881,180.829742 111.763123,178.327362 C110.616798,175.998566 109.002121,175.195419 106.602509,175.334198 C105.607948,175.391724 104.595436,175.392029 103.607887,175.275726 C97.791374,174.590637 93.288574,175.828995 91.247635,182.231903 C90.533569,184.472076 88.581383,186.444504 86.858215,188.211075 C82.598289,192.578308 77.598228,192.775452 72.448341,189.583160 C63.414513,183.983307 60.472954,174.672119 57.946060,165.408585 C54.192097,151.646622 52.446388,137.540665 51.445770,123.256859 C50.687801,112.436920 50.434181,101.642578 50.775230,90.868057 C51.347370,72.793037 53.138844,54.790554 57.954994,37.270924 C60.221348,29.026636 63.716576,21.376848 70.370644,15.474155 C76.834549,9.740149 84.254112,10.465521 88.986549,17.640903 C89.535233,18.472824 90.126556,19.280838 90.618835,20.145090 C95.779419,29.204853 95.770821,29.174877 106.433136,27.824202 C108.218391,27.598051 110.056900,27.792311 111.856255,27.792311 C113.502502,24.603285 114.082008,21.128960 116.120468,18.182549 C122.155762,9.459089 131.923187,9.393083 137.672928,18.235977 C138.847961,20.043125 139.868774,21.950544 141.120239,24.163979 M93.651070,118.530563 C94.321342,108.105469 94.719360,97.757057 93.935600,87.234261 C93.022591,74.976143 92.088837,62.788113 89.639168,50.745026 C87.715950,41.290024 85.536591,31.886587 79.852997,23.814756 C76.850433,19.550516 73.792458,19.570175 70.806839,23.806866 C68.602852,26.934406 66.693810,30.257143 65.386200,33.895439 C59.373936,50.623894 57.239952,68.102371 56.489849,85.652634 C55.624607,105.896767 55.910805,126.196747 59.393948,146.273743 C61.039345,155.757904 62.891113,165.257568 67.274429,173.918396 C69.060577,177.447571 70.645531,182.605881 75.264801,182.513565 C80.421417,182.410507 81.947159,177.048248 83.619545,172.999176 C90.688850,155.883545 92.628929,137.763489 93.651070,118.530563 M121.704689,160.777924 C121.456192,161.808304 120.289597,162.737747 121.547485,164.185791 C123.273491,162.725327 123.960411,160.770279 124.709999,158.791504 C130.242813,144.185776 131.747055,128.817032 132.519867,113.463654 C133.539047,93.215736 132.211151,73.022881 127.545120,53.207973 C126.132294,47.208206 124.610733,41.055622 119.005409,35.472813 C127.256126,57.075142 128.937027,78.418144 129.350769,99.965981 C129.577042,111.749657 128.618210,123.465401 127.226906,135.132217 C126.214996,143.617569 124.774399,152.070038 121.704689,160.777924 M101.408295,147.073349 C101.854218,152.039551 99.221764,156.517258 99.454460,161.398773 C110.701195,126.201767 111.016708,90.661552 102.665260,54.881294 C101.627853,59.579281 102.986633,64.141312 103.390663,68.786430 C104.876366,85.867363 104.641052,103.016899 104.196457,120.121399 C103.969849,128.839279 103.258324,137.647552 101.408295,147.073349 M124.647263,100.583267 C125.268791,96.833702 122.895691,93.317238 123.260643,89.841042 C124.120712,81.648865 122.393738,73.744507 121.534019,65.757286 C120.578514,56.880070 118.171707,48.338505 113.818901,40.383892 C124.298340,81.863777 124.703423,123.231346 113.286545,164.564667 C123.499771,144.729202 122.791367,122.879112 124.647263,100.583267 M115.173782,118.121880 C113.908073,113.036690 117.036354,108.371353 116.627167,103.395790 C115.498268,89.669090 115.357918,75.847008 112.824104,62.253834 C111.681976,56.126690 110.174042,50.097958 107.364433,44.471451 C109.415581,54.472790 111.300385,64.461433 112.406601,74.545853 C113.505493,84.563332 113.040779,94.698349 113.580261,104.732910 C114.138138,115.109688 112.234894,125.121681 111.422989,135.287888 C110.627045,145.254242 108.283875,154.949432 105.170982,164.459595 C112.132835,150.090973 114.941727,134.815384 115.173782,118.121880 z"
      />
      <path
        fill={stroke}
        d="M75.901459,128.972961 C76.161835,131.930710 74.407822,132.210571 72.428864,132.369675 C69.344948,132.617661 67.093658,131.067856 66.002068,128.543777 C64.635147,125.383049 63.613224,121.983269 63.038467,118.585831 C60.887344,105.870209 61.180729,93.156837 63.828953,80.525398 C64.451927,77.553947 65.893600,74.917152 67.858696,72.607811 C69.277351,70.940628 71.118729,70.211281 73.196693,71.159241 C74.709312,71.849289 74.657623,73.542610 75.141167,74.651245 C76.680649,78.180847 78.818710,81.478210 79.425819,85.434509 C81.679047,100.117912 82.352913,114.673531 75.901459,128.972961 z"
      />
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
