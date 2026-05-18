import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchInventoryCounts, wipeAllInventory } from '../../api/admin'

interface Props {
  onClose: () => void
}

const CONFIRM_PHRASE = 'BORRAR TODO'

export default function WipeAllModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { data: counts, isLoading } = useQuery({ queryKey: ['inventory-counts'], queryFn: fetchInventoryCounts })

  const wipe = useMutation({
    mutationFn: wipeAllInventory,
    onSuccess: () => {
      setDone(true)
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['barcodes'] })
      qc.invalidateQueries({ queryKey: ['inventory-counts'] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const canWipe = confirm.trim().toUpperCase() === CONFIRM_PHRASE

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚠ Borrar todo el inventario</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {done ? (
          <>
            <p className="modal-stock">Inventario borrado.</p>
            <div className="flow-actions">
              <button className="btn btn--primary btn--expand" onClick={onClose}>Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-stock">
              Esta acción elimina <strong>todas</strong> las filas de las cuatro tablas. No se puede deshacer.
            </p>

            {isLoading && <div className="main-loading"><span className="spinner" /></div>}
            {counts && (
              <ul className="delete-impact">
                <li>Filamentos: <strong>{counts.families}</strong></li>
                <li>Movimientos: <strong>{counts.movements}</strong></li>
                <li>Códigos de barras: <strong>{counts.barcodes}</strong></li>
                <li>Proyecciones de stock: <strong>{counts.projections}</strong></li>
              </ul>
            )}

            <div className="family-form__field">
              <label>Escribí <code>{CONFIRM_PHRASE}</code> para confirmar</label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
              />
            </div>

            {error && <p className="flow-error">{error}</p>}

            <div className="flow-actions">
              <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
              <button
                className="btn btn--danger btn--expand"
                disabled={!canWipe || wipe.isPending}
                onClick={() => wipe.mutate()}
              >
                {wipe.isPending ? <span className="spinner" /> : 'Borrar todo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
