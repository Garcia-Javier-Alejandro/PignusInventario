import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCreateFamily } from '../../hooks/useFamilies'
import { registerBarcode } from '../../api/barcode'
import ColorPalette from '../../components/ColorPalette'
import { VISUAL_COLOR_LABELS } from '../../lib/visualColors'
import type { NormalizedVisualColor } from '../../types'

export default function FamilyCreate() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pendingBarcode = params.get('barcode')

  const [form, setForm] = useState({
    brand: '',
    material: '',
    brand_color_name: '',
    normalized_visual_color: 'BLACK' as NormalizedVisualColor,
    reorder_threshold: 3,
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const create = useCreateFamily()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const family = await create.mutateAsync({
        ...form,
        reorder_threshold: Number(form.reorder_threshold),
        notes: form.notes || null,
      })
      if (pendingBarcode) {
        await registerBarcode(pendingBarcode, family.id)
      }
      navigate(`/families/${family.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear familia')
    }
  }

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">Nueva familia de filamento</span>
      </div>

      {pendingBarcode && (
        <div className="barcode-hint">
          Código <code>{pendingBarcode}</code> se registrará automáticamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="family-form">
        <div className="family-form__field">
          <label>Marca *</label>
          <input type="text" value={form.brand} onChange={set('brand')} required placeholder="ej. eSUN" />
        </div>

        <div className="family-form__field">
          <label>Material *</label>
          <input type="text" value={form.material} onChange={set('material')} required placeholder="ej. PLA" />
        </div>

        <div className="family-form__field">
          <label>Nombre de color (del fabricante) *</label>
          <input type="text" value={form.brand_color_name} onChange={set('brand_color_name')} required placeholder="ej. Matte Black" />
        </div>

        <div className="family-form__field">
          <label>Color visual * <span className="family-form__hint">{VISUAL_COLOR_LABELS[form.normalized_visual_color]}</span></label>
          <ColorPalette
            value={form.normalized_visual_color}
            onChange={(next) => next && setForm((f) => ({ ...f, normalized_visual_color: next }))}
          />
        </div>

        <div className="family-form__field">
          <label>Umbral de stock bajo *</label>
          <input
            type="number"
            className="manual-input num"
            inputMode="numeric"
            min={0}
            value={form.reorder_threshold}
            onChange={set('reorder_threshold')}
            required
          />
        </div>

        <div className="family-form__field">
          <label>Notas</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Opcional" />
        </div>

        {error && <p className="flow-error">{error}</p>}

        <div className="flow-actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary btn--expand" disabled={create.isPending}>
            {create.isPending ? <span className="spinner" /> : 'Crear familia'}
          </button>
        </div>
      </form>
    </div>
  )
}
