import { useState } from 'react'
import { usePatchMovement } from '../../hooks/useMovements'
import type { InventoryMovement } from '../../types'

interface Props {
  movement: InventoryMovement
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Recibido',
  CONSUME_OPEN: 'Consumido',
  MANUAL_ADJUSTMENT: 'Ajuste',
}

export default function MovementEditModal({ movement, onClose }: Props) {
  const isReceive = movement.movement_type === 'RECEIVE_STOCK'
  const isConsume = movement.movement_type === 'CONSUME_OPEN'

  // RECEIVE/CONSUME edit as positive magnitude; adjustment keeps its signed value
  const [qty, setQty] = useState(
    isReceive || isConsume ? Math.abs(movement.quantity_delta) : movement.quantity_delta
  )
  const [notes, setNotes] = useState(movement.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const patch = usePatchMovement()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (qty === 0) { setError('La cantidad no puede ser cero'); return }
    if (isReceive && qty < 1) { setError('La cantidad debe ser positiva'); return }
    if (isConsume && qty < 1) { setError('La cantidad debe ser positiva'); return }

    let delta = qty
    if (isReceive) delta = Math.abs(qty)
    if (isConsume) delta = -Math.abs(qty)

    try {
      await patch.mutateAsync({
        id: movement.id,
        body: { quantity_delta: delta, notes: notes.trim() || null },
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const qtyLabel = isReceive
    ? 'Cantidad recibida'
    : isConsume
      ? 'Cantidad consumida'
      : 'Δ ajuste (positivo = agregar, negativo = restar)'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Editar movimiento</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {movement.brand && (
          <p className="modal-family">
            {movement.brand} {movement.material} {movement.brand_color_name}
          </p>
        )}
        <p className="modal-stock">
          {TYPE_LABELS[movement.movement_type]} · creado por {movement.created_by} ·{' '}
          {new Date(movement.created_at).toLocaleDateString('es-AR')}
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="family-form__field">
            <label>{qtyLabel}</label>
            <input
              type="number"
              className="manual-input num"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              autoFocus
            />
          </div>

          <div className="family-form__field">
            <label>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la edición (opcional)"
            />
          </div>

          {error && <p className="flow-error">{error}</p>}

          <div className="flow-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary btn--expand" disabled={patch.isPending}>
              {patch.isPending ? <span className="spinner" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
