import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamilyById, usePatchFamily } from '../../hooks/useFamilies'
import { useMovements } from '../../hooks/useMovements'
import ManualAdjustModal from '../../components/ManualAdjustModal'
import MovementEditModal from '../../components/MovementEditModal'
import AlternativesList from '../../components/AlternativesList'
import type { InventoryMovement } from '../../types'

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Recibido',
  CONSUME_OPEN: 'Consumido',
  MANUAL_ADJUSTMENT: 'Ajuste',
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showAdjust, setShowAdjust] = useState(false)
  const [editMovement, setEditMovement] = useState<InventoryMovement | null>(null)

  const { data: family, isLoading } = useFamilyById(id!)
  const { data: movementsData } = useMovements({ filament_family_id: id, limit: 20 })
  const patch = usePatchFamily()

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>
  if (!family) return <div className="main-error">Filamento no encontrado</div>

  const toggleActive = () => patch.mutate({ id: family.id, body: { active: !family.active } })

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">
          <button className="btn btn--ghost btn--xs" onClick={() => navigate('/families')}>← Volver</button>
        </span>
        <span className="toolbar-right">
          <button className="btn btn--ghost btn--xs" onClick={() => setShowAdjust(true)}>Ajuste</button>
        </span>
      </div>

      <div className="detail-header">
        <h1 className="detail-title">{family.brand} {family.material}</h1>
        <p className="detail-subtitle">{family.brand_color_name}</p>
        <p className="detail-color-tag">{family.normalized_visual_color}</p>
      </div>

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Stock actual</div>
          <div className="kpi-card__value" style={{ color: family.is_low_stock ? 'var(--err)' : undefined }}>
            {family.current_quantity}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Umbral</div>
          <div className="kpi-card__value">{family.reorder_threshold}</div>
        </div>
      </div>

      {family.is_low_stock && (
        <div className="low-stock-banner">
          <span className="pill pill--pending">Stock bajo</span>
          <span> — se recomienda reabastecer</span>
        </div>
      )}

      <AlternativesList sourceId={family.id} enabled={family.is_low_stock} />

      <div className="detail-meta">
        <div className="detail-meta__row">
          <span>Activo</span>
          <button className={`pill ${family.active ? 'pill--ok' : ''}`} onClick={toggleActive} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>
            {family.active ? 'Sí' : 'No'}
          </button>
        </div>
        {family.notes && (
          <div className="detail-meta__row">
            <span>Notas</span>
            <span>{family.notes}</span>
          </div>
        )}
      </div>

      <section className="dashboard-section">
        <h2 className="dashboard-section__title">Movimientos recientes</h2>
        {movementsData?.movements.length === 0 && (
          <p className="empty-state">Sin movimientos</p>
        )}
        {movementsData && movementsData.movements.length > 0 && (
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr><th>Tipo</th><th>Δ</th><th>Notas</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {movementsData.movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={`pill ${m.movement_type === 'RECEIVE_STOCK' ? 'pill--ok' : 'pill--pending'}`}>
                        {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td style={{ color: m.quantity_delta > 0 ? 'var(--ok)' : 'var(--err)' }}>
                      {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                    <td className="cell-truncate">{m.notes ?? '—'}</td>
                    <td>{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                    <td>
                      <button className="btn btn--ghost btn--xs" onClick={() => setEditMovement(m)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAdjust && (
        <ManualAdjustModal family={family} onClose={() => setShowAdjust(false)} />
      )}

      {editMovement && (
        <MovementEditModal
          movement={{ ...editMovement, brand: family.brand, material: family.material, brand_color_name: family.brand_color_name }}
          onClose={() => setEditMovement(null)}
        />
      )}
    </div>
  )
}
