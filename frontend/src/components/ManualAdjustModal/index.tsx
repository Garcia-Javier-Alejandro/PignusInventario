import { useState } from 'react'
import { useAdjust } from '../../hooks/useMovements'
import type { FilamentFamily } from '../../types'

interface Props {
  family: FilamentFamily
  onClose: () => void
}

export default function ManualAdjustModal({ family, onClose }: Props) {
  const [delta, setDelta] = useState(0)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const adjust = useAdjust()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (delta === 0) { setError('El ajuste no puede ser cero'); return }
    if (!notes.trim()) { setError('Las notas son obligatorias'); return }
    try {
      await adjust.mutateAsync({ familyId: family.id, delta: Number(delta), notes })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Ajuste manual</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <p className="modal-family">
          {family.brand} {family.material} {family.brand_color_name}
        </p>
        <p className="modal-stock">Stock actual: <strong>{family.current_quantity}</strong></p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="family-form__field">
            <label>Delta (positivo = agregar, negativo = restar)</label>
            <input
              type="number"
              className="manual-input num"
              inputMode="numeric"
              value={delta}
              onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
              autoFocus
            />
          </div>

          <div className="family-form__field">
            <label>Motivo *</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Revisión física — 2 dañados"
              required
            />
          </div>

          {error && <p className="flow-error">{error}</p>}

          <div className="flow-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary btn--expand" disabled={adjust.isPending}>
              {adjust.isPending ? <span className="spinner" /> : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
