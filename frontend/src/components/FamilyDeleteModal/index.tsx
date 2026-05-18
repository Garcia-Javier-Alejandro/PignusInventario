import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDeleteFamily } from '../../hooks/useFamilies'
import { listBarcodes } from '../../api/barcode'
import type { FilamentFamily } from '../../types'

interface Props {
  family: FilamentFamily
  onClose: () => void
  onDeleted: () => void
}

export default function FamilyDeleteModal({ family, onClose, onDeleted }: Props) {
  const [error, setError] = useState<string | null>(null)
  const del = useDeleteFamily()
  const { data: barcodesData } = useQuery({ queryKey: ['barcodes'], queryFn: listBarcodes })
  const barcodeCount = barcodesData?.mappings.filter((m) => m.filament_family_id === family.id).length ?? 0

  const handleDelete = async () => {
    setError(null)
    try {
      await del.mutateAsync(family.id)
      onDeleted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">¿Borrar filamento?</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <p className="modal-family">{family.brand} {family.material} {family.brand_color_name}</p>

        <ul className="delete-impact">
          <li>Se borrará el filamento y su proyección de stock.</li>
          {barcodeCount > 0 && (
            <li>Se desasociarán <strong>{barcodeCount}</strong> código(s) de barras.</li>
          )}
          <li>Si el filamento tiene movimientos registrados, el borrado se rechazará. En ese caso, desactivalo en lugar de borrarlo.</li>
        </ul>

        {error && <p className="flow-error">{error}</p>}

        <div className="flow-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn--danger btn--expand"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            {del.isPending ? <span className="spinner" /> : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
