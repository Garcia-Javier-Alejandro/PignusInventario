import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useFamilyById, usePatchFamily } from '../../hooks/useFamilies'
import { useMovements } from '../../hooks/useMovements'
import { listBarcodes } from '../../api/barcode'
import ManualAdjustModal from '../../components/ManualAdjustModal'
import MovementEditModal from '../../components/MovementEditModal'
import FamilyEditModal from '../../components/FamilyEditModal'
import FamilyDeleteModal from '../../components/FamilyDeleteModal'
import AlternativesList from '../../components/AlternativesList'
import ColorPill from '../../components/ColorPill'
import { EditIcon, DeleteIcon } from '../../components/icons'
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
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editMovement, setEditMovement] = useState<InventoryMovement | null>(null)

  const { data: family, isLoading } = useFamilyById(id!)
  const { data: movementsData } = useMovements({ filament_family_id: id, limit: 20 })
  const { data: barcodesData } = useQuery({ queryKey: ['barcodes'], queryFn: listBarcodes })
  const patch = usePatchFamily()

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>
  if (!family) return <div className="main-error">Filamento no encontrado</div>

  const familyBarcodes = barcodesData?.mappings.filter((m) => m.filament_family_id === family.id) ?? []
  const toggleActive = () => patch.mutate({ id: family.id, body: { active: !family.active } })

  return (
    <div className="flow-page">
      <div className="detail-header">
        <h1 className="detail-title">{family.brand} {family.material}</h1>
        <ColorPill color={family.normalized_visual_color} label={family.brand_color_name} />
      </div>

      <div className="filament-stats">
        <div className="filament-stats__item">
          <div className="kpi-card__eyebrow">Stock actual</div>
          <div className="kpi-card__value" style={{ color: family.is_low_stock ? 'var(--err)' : undefined }}>
            {family.current_quantity}
          </div>
        </div>
        <div className="filament-stats__divider" />
        <div className="filament-stats__item">
          <div className="kpi-card__eyebrow">Umbral</div>
          <div className="kpi-card__value">{family.reorder_threshold}</div>
        </div>
      </div>

      <div className="detail-meta">
        <div className="detail-meta__row">
          <span>Códigos</span>
          <span className="detail-meta__value detail-meta__codes">
            {familyBarcodes.length === 0
              ? <span style={{ color: 'var(--ink-3)' }}>Ninguno</span>
              : familyBarcodes.map((b) => <code key={b.barcode}>{b.barcode}</code>)}
          </span>
        </div>
        <div className="detail-meta__row">
          <span>Activo</span>
          <button
            className={`pill ${family.active ? 'pill--ok' : ''}`}
            onClick={toggleActive}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {family.active ? 'Sí' : 'No'}
          </button>
        </div>
        {family.notes && (
          <div className="detail-meta__row">
            <span>Notas</span>
            <span className="detail-meta__value">{family.notes}</span>
          </div>
        )}
      </div>

      <div className="detail-actions">
        <button className="btn btn--secondary" onClick={() => setShowAdjust(true)}>Ajuste</button>
        <button className="btn btn--ghost icon-btn-row" onClick={() => setShowEdit(true)} title="Editar">
          <EditIcon /> Editar
        </button>
        <button
          className="btn btn--ghost"
          onClick={toggleActive}
          disabled={patch.isPending}
          title={family.active ? 'Desactivar' : 'Activar'}
        >
          {family.active ? 'Desactivar' : 'Activar'}
        </button>
        <button
          className="btn btn--ghost icon-btn-row"
          onClick={() => setShowDelete(true)}
          title="Borrar"
          style={{ color: 'var(--err)' }}
        >
          <DeleteIcon /> Borrar
        </button>
      </div>

      {family.is_low_stock && (
        <div className="low-stock-banner">
          <span className="pill pill--pending">Stock bajo</span>
          <span> — se recomienda reabastecer</span>
        </div>
      )}

      <AlternativesList sourceId={family.id} enabled={family.is_low_stock} />

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

      {showEdit && (
        <FamilyEditModal family={family} onClose={() => setShowEdit(false)} />
      )}

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
