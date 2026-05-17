import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilies } from '../../hooks/useFamilies'
import { registerBarcode } from '../../api/barcode'

interface Props {
  barcode: string
  onRegistered: () => void
  onClose: () => void
}

export default function BarcodeRegistration({ barcode, onRegistered, onClose }: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: families } = useFamilies({ search: search || undefined })

  const handleMap = async (familyId: string) => {
    setSaving(true)
    setError(null)
    try {
      await registerBarcode(barcode, familyId)
      onRegistered()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Código desconocido</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <p className="modal-code"><code>{barcode}</code></p>
        <p className="modal-hint">Asociar a una familia existente o crear una nueva</p>

        <input
          type="search"
          placeholder="Buscar familia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {error && <p className="flow-error">{error}</p>}

        <div className="barcode-reg-list">
          {families?.map((f) => (
            <button
              key={f.id}
              className="barcode-reg-item"
              onClick={() => handleMap(f.id)}
              disabled={saving}
            >
              <span className="barcode-reg-name">{f.brand} {f.material} {f.brand_color_name}</span>
              <span className="pill pill--ok">{f.current_quantity}</span>
            </button>
          ))}
        </div>

        <button
          className="btn btn--secondary btn--expand"
          onClick={() => navigate(`/families/new?barcode=${encodeURIComponent(barcode)}`)}
        >
          + Crear nueva familia
        </button>
      </div>
    </div>
  )
}
