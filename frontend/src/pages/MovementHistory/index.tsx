import { useState } from 'react'
import { useMovements } from '../../hooks/useMovements'

const PAGE_SIZE = 50
const TYPE_LABELS: Record<string, string> = {
  RECEIVE_STOCK: 'Recibido',
  CONSUME_OPEN: 'Consumido',
  MANUAL_ADJUSTMENT: 'Ajuste',
}
const TYPES = Object.keys(TYPE_LABELS)

export default function MovementHistory() {
  const [movementType, setMovementType] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useMovements({
    movement_type: movementType || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">Historial de movimientos</span>
      </div>

      <div className="family-filter-pills" style={{ marginBottom: 'var(--space-4)' }}>
        <button
          className={`btn btn--xs ${!movementType ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => { setMovementType(''); setPage(0) }}
        >Todos</button>
        {TYPES.map((t) => (
          <button
            key={t}
            className={`btn btn--xs ${movementType === t ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => { setMovementType(movementType === t ? '' : t); setPage(0) }}
          >{TYPE_LABELS[t]}</button>
        ))}
      </div>

      {isLoading && <div className="main-loading"><span className="spinner" /></div>}

      {data && (
        <>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Familia</th>
                  <th>Tipo</th>
                  <th>Δ</th>
                  <th>Notas</th>
                  <th>Por</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="family-name">{m.brand} {m.material}</div>
                      <div className="family-color">{m.brand_color_name}</div>
                    </td>
                    <td>
                      <span className={`pill ${m.movement_type === 'RECEIVE_STOCK' ? 'pill--ok' : m.movement_type === 'CONSUME_OPEN' ? 'pill--pending' : ''}`}>
                        {TYPE_LABELS[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td style={{ color: m.quantity_delta > 0 ? 'var(--ok)' : 'var(--err)', fontWeight: 'var(--weight-semi)' }}>
                      {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                    <td className="cell-truncate">{m.notes ?? '—'}</td>
                    <td className="cell-truncate">{m.created_by}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn--ghost btn--xs" onClick={() => setPage(page - 1)} disabled={page === 0}>← Anterior</button>
              <span className="pagination-info">{page + 1} / {totalPages}</span>
              <button className="btn btn--ghost btn--xs" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {data?.movements.length === 0 && !isLoading && (
        <p className="empty-state">No hay movimientos registrados</p>
      )}
    </div>
  )
}
