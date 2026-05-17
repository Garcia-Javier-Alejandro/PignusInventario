import { useEffect, useState } from 'react'
import { useScanner } from '../../hooks/useScanner'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function Scanner({ onDetected, onClose }: Props) {
  const [manual, setManual] = useState('')

  const handleDetected = (barcode: string) => {
    stop()
    onDetected(barcode)
  }

  const { videoRef, error, start, stop } = useScanner(handleDetected)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  const submitManual = () => {
    const val = manual.trim()
    if (val) { stop(); onDetected(val) }
  }

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <span className="scanner-title">Escanear código</span>
          <button className="iconbtn" onClick={() => { stop(); onClose() }} aria-label="Cerrar">✕</button>
        </div>

        <div className="scanner-viewport">
          <video ref={videoRef} className="scanner-video" autoPlay muted playsInline />
          <div className="scanner-reticle" />
          {error && <p className="scanner-error">{error}</p>}
        </div>

        <div className="scanner-manual">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ingresar código manualmente"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            autoComplete="off"
          />
          <button className="btn btn--secondary" onClick={submitManual} disabled={!manual.trim()}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
