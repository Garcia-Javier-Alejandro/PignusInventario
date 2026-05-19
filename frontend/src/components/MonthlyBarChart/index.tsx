import type { MonthlyPoint } from '../../api/history'

interface Props {
  series: MonthlyPoint[]
}

function monthLabel(ym: string): string {
  // "YYYY-MM" → short Spanish month name: "ene", "feb", etc.
  const d = new Date(`${ym}-15`)
  return d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
}

export default function MonthlyBarChart({ series }: Props) {
  if (series.length === 0) return null

  const maxVal = Math.max(...series.flatMap((p) => [p.consumed, p.received]), 1)
  const ceil = Math.max(Math.ceil(maxVal / 5) * 5, 5)

  return (
    <div className="monthly-chart">
      <div className="monthly-chart__legend">
        <span className="monthly-chart__legend-item monthly-chart__legend-item--received">Ingresos</span>
        <span className="monthly-chart__legend-item monthly-chart__legend-item--consumed">Consumo</span>
      </div>
      <div className="monthly-chart__area">
        <div className="monthly-chart__y">
          <span>{ceil}</span>
          <span>{Math.round(ceil / 2)}</span>
          <span>0</span>
        </div>
        <div className="monthly-chart__bars">
          {series.map((p) => (
            <div key={p.month} className="monthly-chart__group">
              <div className="monthly-chart__pair">
                <div
                  className="monthly-chart__bar monthly-chart__bar--received"
                  style={{ height: `${(p.received / ceil) * 100}%` }}
                  title={`Ingresos ${p.received} kg`}
                />
                <div
                  className="monthly-chart__bar monthly-chart__bar--consumed"
                  style={{ height: `${(p.consumed / ceil) * 100}%` }}
                  title={`Consumo ${p.consumed} kg`}
                />
              </div>
              <span className="monthly-chart__label">{monthLabel(p.month)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
