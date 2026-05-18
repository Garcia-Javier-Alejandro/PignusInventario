import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilies, usePatchFamily } from '../../hooks/useFamilies'
import ManualAdjustModal from '../../components/ManualAdjustModal'
import ColorPalette from '../../components/ColorPalette'
import type { FilamentFamily, NormalizedVisualColor } from '../../types'

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Nylon', 'PC']

export default function FamilyList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [material, setMaterial] = useState('')
  const [visualColor, setVisualColor] = useState<NormalizedVisualColor | ''>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [adjustFamily, setAdjustFamily] = useState<FilamentFamily | null>(null)
  const [editCell, setEditCell] = useState<{ id: string; field: 'reorder_threshold' | 'notes' } | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: families, isLoading } = useFamilies({
    search: search || undefined,
    material: material || undefined,
    visual_color: visualColor || undefined,
    low_stock_only: lowStockOnly || undefined,
  })
  const patch = usePatchFamily()

  const startEdit = (family: FilamentFamily, field: 'reorder_threshold' | 'notes') => {
    setEditCell({ id: family.id, field })
    setEditValue(field === 'reorder_threshold' ? String(family.reorder_threshold) : (family.notes ?? ''))
  }

  const commitEdit = async (family: FilamentFamily) => {
    if (!editCell) return
    const body = editCell.field === 'reorder_threshold'
      ? { reorder_threshold: Math.max(0, parseInt(editValue) || 0) }
      : { notes: editValue || null }
    await patch.mutateAsync({ id: family.id, body })
    setEditCell(null)
  }

  const toggleActive = (family: FilamentFamily) =>
    patch.mutate({ id: family.id, body: { active: !family.active } })

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">Inventario</span>
        <span className="toolbar-right">
          <button className="btn btn--primary btn--xs" onClick={() => navigate('/families/new')}>
            + Nuevo
          </button>
        </span>
      </div>

      <div className="family-filters">
        <input
          type="search"
          placeholder="Buscar marca, material, color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="family-filter-pills">
          {MATERIALS.map((m) => (
            <button
              key={m}
              className={`btn btn--xs ${material === m ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setMaterial(material === m ? '' : m)}
            >{m}</button>
          ))}
          <span className="filter-divider" />
          <button
            className={`btn btn--xs ${lowStockOnly ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setLowStockOnly(!lowStockOnly)}
          >Stock bajo</button>
        </div>

        <ColorPalette value={visualColor} onChange={setVisualColor} allowClear />
      </div>

      {isLoading && <div className="main-loading"><span className="spinner" /></div>}

      {families && (
        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Filamento</th>
                <th>Stock</th>
                <th>Umbral</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr
                  key={f.id}
                  className={f.is_low_stock ? 'row--low-stock' : ''}
                  onClick={() => navigate(`/families/${f.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="family-name">{f.brand} {f.material}</div>
                    <div className="family-color">{f.brand_color_name}</div>
                  </td>
                  <td>
                    <span className={`pill ${f.current_quantity === 0 ? 'pill--pending' : f.is_low_stock ? 'pill--pending' : 'pill--ok'}`}>
                      {f.current_quantity}
                    </span>
                  </td>
                  <td onClick={(e) => { e.stopPropagation(); startEdit(f, 'reorder_threshold') }}>
                    {editCell?.id === f.id && editCell.field === 'reorder_threshold' ? (
                      <input
                        className="inline-edit"
                        type="number"
                        inputMode="numeric"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(f)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(f); if (e.key === 'Escape') setEditCell(null) }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="editable-cell">{f.reorder_threshold}</span>
                    )}
                  </td>
                  <td onClick={(e) => { e.stopPropagation(); toggleActive(f) }}>
                    <span className={`pill ${f.active ? 'pill--ok' : ''}`}>
                      {f.active ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => setAdjustFamily(f)}
                    >Ajuste</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {families?.length === 0 && !isLoading && (
        <p className="empty-state">No hay filamentos. <button className="link-btn" onClick={() => navigate('/families/new')}>Crear el primero</button></p>
      )}

      {adjustFamily && (
        <ManualAdjustModal family={adjustFamily} onClose={() => setAdjustFamily(null)} />
      )}
    </div>
  )
}
