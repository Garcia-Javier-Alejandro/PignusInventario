import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listBarcodes, reassignBarcode, deleteBarcode, type BarcodeMapping } from '../../api/barcode'
import { useFamilies } from '../../hooks/useFamilies'

interface Props {
  onClose: () => void
}

export default function BarcodeAdminModal({ onClose }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['barcodes'], queryFn: listBarcodes })
  const [reassigning, setReassigning] = useState<BarcodeMapping | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reassign = useMutation({
    mutationFn: ({ barcode, family_id }: { barcode: string; family_id: string }) =>
      reassignBarcode(barcode, family_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcodes'] })
      setReassigning(null)
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const del = useMutation({
    mutationFn: (barcode: string) => deleteBarcode(barcode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barcodes'] }),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const handleDelete = (m: BarcodeMapping) => {
    if (!confirm(`¿Borrar el código ${m.barcode}?`)) return
    setError(null)
    del.mutate(m.barcode)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Códigos de barras registrados</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {error && <p className="flow-error">{error}</p>}

        {isLoading && <div className="main-loading"><span className="spinner" /></div>}

        {data && data.mappings.length === 0 && (
          <p className="empty-state">No hay códigos registrados</p>
        )}

        {data && data.mappings.length > 0 && (
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Filamento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.mappings.map((m) => (
                  <tr key={m.barcode}>
                    <td><code>{m.barcode}</code></td>
                    <td>
                      <div className="family-name">{m.brand} {m.material}</div>
                      <div className="family-color">{m.brand_color_name}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn--ghost btn--xs"
                        onClick={() => { setError(null); setReassigning(m) }}
                      >Reasignar</button>
                      <button
                        className="btn btn--ghost btn--xs"
                        onClick={() => handleDelete(m)}
                        disabled={del.isPending}
                        style={{ color: 'var(--err)' }}
                      >Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reassigning && (
          <ReassignPicker
            mapping={reassigning}
            onPick={(family_id) => reassign.mutate({ barcode: reassigning.barcode, family_id })}
            onCancel={() => setReassigning(null)}
            isPending={reassign.isPending}
          />
        )}
      </div>
    </div>
  )
}

function ReassignPicker({ mapping, onPick, onCancel, isPending }: {
  mapping: BarcodeMapping
  onPick: (family_id: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [search, setSearch] = useState('')
  const { data: families } = useFamilies({ search: search || undefined })

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Reasignar código</span>
          <button className="iconbtn" onClick={onCancel} aria-label="Cerrar">✕</button>
        </div>

        <p className="modal-code"><code>{mapping.barcode}</code></p>
        <p className="modal-hint">Actualmente: {mapping.brand} {mapping.material} {mapping.brand_color_name}</p>

        <input
          type="search"
          placeholder="Buscar filamento destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="barcode-reg-list">
          {families?.filter((f) => f.id !== mapping.filament_family_id).map((f) => (
            <button
              key={f.id}
              className="barcode-reg-item"
              onClick={() => onPick(f.id)}
              disabled={isPending}
            >
              <span className="barcode-reg-name">{f.brand} {f.material} {f.brand_color_name}</span>
              <span className="pill pill--ok">{f.current_quantity}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
