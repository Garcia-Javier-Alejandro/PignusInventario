import { useNavigate } from 'react-router-dom'
import { useAlternatives } from '../../hooks/useFamilies'

export default function AlternativesList({ sourceId, enabled }: { sourceId: string; enabled: boolean }) {
  const navigate = useNavigate()
  const { data } = useAlternatives(sourceId, enabled)

  if (!enabled || !data || data.alternatives.length === 0) return null

  return (
    <section className="dashboard-section">
      <h2 className="dashboard-section__title">Alternativas disponibles</h2>
      <div className="alternatives-list">
        {data.alternatives.map((f) => (
          <button
            key={f.id}
            className="alternative-item"
            onClick={() => navigate(`/families/${f.id}`)}
          >
            <div>
              <div className="family-name">{f.brand} {f.material}</div>
              <div className="family-color">{f.brand_color_name}</div>
            </div>
            <span className={`pill ${f.is_low_stock ? 'pill--pending' : 'pill--ok'}`}>
              {f.current_quantity}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
