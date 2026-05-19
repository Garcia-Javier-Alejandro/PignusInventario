import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchInventoryCounts, wipeAllMovements } from '../../api/admin'

interface Props {
  onClose: () => void
}

const CONFIRM_PHRASE = 'BORRAR'

export default function WipeMovementsModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { data: counts, isLoading } = useQuery({ queryKey: ['inventory-counts'], queryFn: fetchInventoryCounts })

  const wipe = useMutation({
    mutationFn: wipeAllMovements,
    onSuccess: () => {
      setDone(true)
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['inventory-counts'] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const canWipe = confirm.trim().toUpperCase() === CONFIRM_PHRASE

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚠ Borrar movimientos</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {done ? (
          <>
            <p className="modal-stock">
              Historial limpiado. El stock actual de cada filamento se conservó
              mediante un movimiento <em>Importación inicial</em> equivalente.
            </p>
            <div className="flow-actions">
              <button className="btn btn--primary btn--expand" onClick={onClose}>Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-stock">
              Borra <strong>todos los movimientos registrados</strong> pero <strong>conserva el stock actual</strong>:
              por cada filamento con stock se crea un único movimiento <em>Importación inicial</em>
              que repone el balance. El catálogo y los códigos de barras se conservan.
              No se puede deshacer.
            </p>

            {isLoading && <div className="main-loading"><span className="spinner" /></div>}
            {counts && (
              <ul className="delete-impact">
                <li>Movimientos a borrar: <strong>{counts.movements}</strong></li>
                <li>Filamentos conservados: <strong>{counts.families}</strong></li>
                <li>Códigos de barras conservados: <strong>{counts.barcodes}</strong></li>
                <li>Stock actual: <strong>conservado por filamento</strong></li>
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
                {wipe.isPending ? <span className="spinner" /> : 'Borrar movimientos'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
