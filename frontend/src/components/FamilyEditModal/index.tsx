import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatchFamily } from '../../hooks/useFamilies'
import { listBarcodes, registerBarcode, deleteBarcode } from '../../api/barcode'
import ColorPalette from '../ColorPalette'
import Scanner from '../Scanner'
import { DeleteIcon } from '../icons'
import { VISUAL_COLOR_LABELS } from '../../lib/visualColors'
import type { FilamentFamily, NormalizedVisualColor } from '../../types'

interface Props {
  family: FilamentFamily
  onClose: () => void
}

export default function FamilyEditModal({ family, onClose }: Props) {
  const qc = useQueryClient()
  const patch = usePatchFamily()

  const [brand, setBrand] = useState(family.brand)
  const [material, setMaterial] = useState(family.material)
  const [brand_color_name, setColorName] = useState(family.brand_color_name)
  const [visualColor, setVisualColor] = useState<NormalizedVisualColor>(family.normalized_visual_color)
  const [reorder_threshold, setThreshold] = useState(family.reorder_threshold)
  const [notes, setNotes] = useState(family.notes ?? '')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: barcodesData } = useQuery({ queryKey: ['barcodes'], queryFn: listBarcodes })
  const familyBarcodes = barcodesData?.mappings.filter((m) => m.filament_family_id === family.id) ?? []

  const addBarcode = useMutation({
    mutationFn: (code: string) => registerBarcode(code, family.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barcodes'] }),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error al agregar código'),
  })

  const removeBarcode = useMutation({
    mutationFn: (code: string) => deleteBarcode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barcodes'] }),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error al borrar código'),
  })

  const diff: Array<[string, string, string]> = []
  if (brand.trim() !== family.brand) diff.push(['Marca', family.brand, brand.trim()])
  if (material.trim() !== family.material) diff.push(['Material', family.material, material.trim()])
  if (brand_color_name.trim() !== family.brand_color_name) diff.push(['Color', family.brand_color_name, brand_color_name.trim()])
  if (visualColor !== family.normalized_visual_color) diff.push(['Color visual', VISUAL_COLOR_LABELS[family.normalized_visual_color], VISUAL_COLOR_LABELS[visualColor]])
  if (reorder_threshold !== family.reorder_threshold) diff.push(['Umbral', String(family.reorder_threshold), String(reorder_threshold)])
  if ((notes || null) !== family.notes) diff.push(['Notas', family.notes ?? '—', notes || '—'])

  const handleSave = async () => {
    setError(null)
    if (!brand.trim() || !material.trim() || !brand_color_name.trim()) {
      setError('Marca, material y color son obligatorios')
      return
    }
    try {
      await patch.mutateAsync({
        id: family.id,
        body: {
          brand: brand.trim(),
          material: material.trim(),
          brand_color_name: brand_color_name.trim(),
          normalized_visual_color: visualColor,
          reorder_threshold,
          notes: notes.trim() || null,
        },
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const handleScanned = (code: string) => {
    setScanning(false)
    const trimmed = code.trim()
    if (!trimmed) return
    setError(null)
    addBarcode.mutate(trimmed)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Editar filamento</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form
          className="family-form"
          onSubmit={(e) => { e.preventDefault(); handleSave() }}
        >
          <div className="family-form__field">
            <label>Marca *</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} required />
          </div>

          <div className="family-form__field">
            <label>Material *</label>
            <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} required />
          </div>

          <div className="family-form__field">
            <label>Color (fabricante) *</label>
            <input type="text" value={brand_color_name} onChange={(e) => setColorName(e.target.value)} required />
          </div>

          <div className="family-form__field">
            <label>Color visual * <span className="family-form__hint">{VISUAL_COLOR_LABELS[visualColor]}</span></label>
            <ColorPalette value={visualColor} onChange={(next) => next && setVisualColor(next)} />
          </div>

          <div className="family-form__field">
            <label>Umbral de stock bajo *</label>
            <input
              type="number"
              className="manual-input num"
              inputMode="numeric"
              min={0}
              value={reorder_threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
              required
            />
          </div>

          <div className="family-form__field">
            <label>Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="family-form__field">
            <label>Códigos de barras asociados</label>
            {familyBarcodes.length === 0 && (
              <p className="empty-state" style={{ padding: 'var(--space-3) 0', textAlign: 'left' }}>Ninguno</p>
            )}
            {familyBarcodes.map((m) => (
              <div key={m.barcode} className="barcode-row">
                <code>{m.barcode}</code>
                <button
                  type="button"
                  className="iconbtn iconbtn--danger"
                  onClick={() => removeBarcode.mutate(m.barcode)}
                  disabled={removeBarcode.isPending}
                  aria-label="Borrar código"
                  title="Borrar"
                >
                  <DeleteIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => { setError(null); setScanning(true) }}
              disabled={addBarcode.isPending}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {addBarcode.isPending ? <span className="spinner" /> : '+ Escanear código'}
            </button>
          </div>

          {diff.length > 0 && (
            <div className="edit-diff">
              <div className="edit-diff__title">Cambios a aplicar</div>
              <ul>
                {diff.map(([field, before, after]) => (
                  <li key={field}><strong>{field}:</strong> <span className="edit-diff__before">{before}</span> → <span className="edit-diff__after">{after}</span></li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="flow-error">{error}</p>}

          <div className="flow-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="btn btn--primary btn--expand"
              disabled={patch.isPending || diff.length === 0}
            >
              {patch.isPending ? <span className="spinner" /> : diff.length === 0 ? 'Sin cambios' : `Guardar (${diff.length})`}
            </button>
          </div>
        </form>
      </div>

      {scanning && (
        <Scanner onDetected={handleScanned} onClose={() => setScanning(false)} />
      )}
    </div>
  )
}
