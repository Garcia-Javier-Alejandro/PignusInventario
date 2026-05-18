import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importInventory, type ImportRow, type ImportResponse } from '../../api/import'
import { VISUAL_COLORS, normalizeVisualColor } from '../../lib/visualColors'

interface Props {
  onClose: () => void
}

interface ParsedRow {
  raw: string[]
  row?: ImportRow
  error?: string
}

const HEADER_HINTS = ['marca', 'brand', 'material']
const VALID_COLOR_SET = new Set(VISUAL_COLORS.map((c) => c.value))

function parseActive(s: string): boolean {
  const v = s.trim().toUpperCase()
  if (v === '' || v === 'FALSE' || v === '0' || v === 'NO' || v === 'FALSO') return false
  return true
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return []

  const delim = lines[0].includes('\t') ? '\t' : ','
  const isHeader = HEADER_HINTS.some((h) => lines[0].toLowerCase().includes(h))
  const dataLines = isHeader ? lines.slice(1) : lines

  return dataLines.map((line): ParsedRow => {
    const raw = line.split(delim).map((s) => s.trim())
    if (raw.length < 6) {
      return { raw, error: `Esperaba 6-7 columnas, encontré ${raw.length}` }
    }
    const [brand, material, brand_color_name, visualRaw, qtyRaw, thresholdRaw, activeRaw = 'TRUE'] = raw
    if (!brand || !material || !brand_color_name) {
      return { raw, error: 'Marca, material y color son obligatorios' }
    }
    const visual = normalizeVisualColor(visualRaw)
    if (!VALID_COLOR_SET.has(visual as never)) {
      return { raw, error: `Color visual inválido: "${visualRaw}" (valores: ${[...VALID_COLOR_SET].join(', ')})` }
    }
    const qty = parseInt(qtyRaw, 10)
    if (!Number.isFinite(qty) || qty < 0) {
      return { raw, error: `Cantidad inválida: "${qtyRaw}"` }
    }
    const threshold = parseInt(thresholdRaw, 10)
    if (!Number.isFinite(threshold) || threshold < 0) {
      return { raw, error: `Umbral inválido: "${thresholdRaw}"` }
    }
    return {
      raw,
      row: {
        brand,
        material,
        brand_color_name,
        normalized_visual_color: visual,
        initial_quantity: qty,
        reorder_threshold: threshold,
        active: parseActive(activeRaw),
      },
    }
  })
}

export default function ImportModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [response, setResponse] = useState<ImportResponse | null>(null)

  const importMut = useMutation({
    mutationFn: (rows: ImportRow[]) => importInventory(rows),
    onSuccess: (res) => {
      setResponse(res)
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const validRows = parsed?.filter((p) => p.row) ?? []
  const errorRows = parsed?.filter((p) => !p.row) ?? []
  const canImport = parsed !== null && validRows.length > 0 && errorRows.length === 0

  const handleValidate = () => {
    setResponse(null)
    setParsed(parseCSV(text))
  }

  const handleImport = () => {
    if (!canImport) return
    importMut.mutate(validRows.map((p) => p.row!))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <span className="modal-title">Importar inventario inicial</span>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {!response && (
          <>
            <p className="modal-hint">
              Pegá filas de tu planilla con 7 columnas: <strong>Marca · Material · Color · Color visual · Cantidad · Umbral · Activo</strong>.
              Color visual debe ser uno de: {VISUAL_COLORS.map((c) => c.value).join(', ')}.
              Aceptado: pestañas o comas.
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={'Grilon\tPLA\tFucsia\tPINK\t10\t3\tTRUE\nGrilon\tPLA\tRojo\tRED\t3\t2\tTRUE'}
              style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--text-sm)' }}
            />

            <div className="flow-actions">
              <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn--secondary" onClick={handleValidate} disabled={!text.trim()}>
                Validar
              </button>
              <button
                className="btn btn--primary"
                onClick={handleImport}
                disabled={!canImport || importMut.isPending}
              >
                {importMut.isPending ? <span className="spinner" /> : `Importar ${validRows.length}`}
              </button>
            </div>

            {parsed && (
              <div className="table-wrap" style={{ marginTop: 'var(--space-3)' }}>
                <table className="orders-table">
                  <thead>
                    <tr><th>#</th><th>Filamento</th><th>Color</th><th>Qty</th><th>Umbral</th><th>Activo</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{p.row ? `${p.row.brand} ${p.row.material} ${p.row.brand_color_name}` : p.raw.slice(0, 3).join(' ')}</td>
                        <td>{p.row?.normalized_visual_color ?? p.raw[3] ?? '—'}</td>
                        <td>{p.row?.initial_quantity ?? p.raw[4] ?? '—'}</td>
                        <td>{p.row?.reorder_threshold ?? p.raw[5] ?? '—'}</td>
                        <td>{p.row ? (p.row.active ? 'Sí' : 'No') : '—'}</td>
                        <td>
                          {p.row
                            ? <span className="pill pill--ok">OK</span>
                            : <span className="pill pill--pending" title={p.error}>{p.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {response && (
          <>
            <div className="kpi-strip" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="kpi-card">
                <div className="kpi-card__eyebrow">Creadas</div>
                <div className="kpi-card__value" style={{ color: 'var(--ok)' }}>{response.created}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card__eyebrow">Duplicadas</div>
                <div className="kpi-card__value">{response.duplicates}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card__eyebrow">Errores</div>
                <div className="kpi-card__value" style={{ color: response.errors ? 'var(--err)' : undefined }}>
                  {response.errors}
                </div>
              </div>
            </div>

            {response.errors > 0 && (
              <div className="table-wrap">
                <table className="orders-table">
                  <thead><tr><th>#</th><th>Error</th></tr></thead>
                  <tbody>
                    {response.results.filter((r) => !r.ok).map((r) => (
                      <tr key={r.index}>
                        <td>{r.index + 1}</td>
                        <td>{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flow-actions">
              <button className="btn btn--primary btn--expand" onClick={onClose}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
