import { useDashboard } from '../../hooks/useDashboard'

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) return <div className="main-loading"><span className="spinner" /></div>
  if (isError) return <div className="main-error">Error al cargar el dashboard</div>

  return (
    <div>
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Total familias</div>
          <div className="kpi-card__value">{data?.total_families ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__eyebrow">Stock bajo</div>
          <div className="kpi-card__value" style={{ color: data?.low_stock_count ? 'var(--err)' : undefined }}>
            {data?.low_stock_count ?? '—'}
          </div>
        </div>
      </div>

      {data && data.low_stock.length > 0 && (
        <section className="dashboard-section">
          <h2 className="dashboard-section__title">Stock bajo</h2>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Familia</th>
                  <th>Stock</th>
                  <th>Umbral</th>
                </tr>
              </thead>
              <tbody>
                {data.low_stock.map((f) => (
                  <tr key={f.id}>
                    <td>{f.brand} {f.material} {f.brand_color_name}</td>
                    <td>
                      <span className={`pill ${f.current_quantity === 0 ? 'pill--err' : 'pill--pending'}`}>
                        {f.current_quantity}
                      </span>
                    </td>
                    <td>{f.reorder_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data && data.recent_movements.length > 0 && (
        <section className="dashboard-section">
          <h2 className="dashboard-section__title">Actividad reciente</h2>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Familia</th>
                  <th>Tipo</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_movements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.brand} {m.material} {m.brand_color_name}</td>
                    <td>
                      <span className={`pill ${m.movement_type === 'RECEIVE_STOCK' ? 'pill--ok' : m.movement_type === 'CONSUME_OPEN' ? 'pill--pending' : ''}`}>
                        {m.movement_type === 'RECEIVE_STOCK' ? 'Recibido' : m.movement_type === 'CONSUME_OPEN' ? 'Consumido' : 'Ajuste'}
                      </span>
                    </td>
                    <td style={{ color: m.quantity_delta > 0 ? 'var(--ok)' : 'var(--err)' }}>
                      {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
