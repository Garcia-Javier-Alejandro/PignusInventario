import { useState, useEffect, useRef } from 'react'
import { useScanner } from '../../hooks/useScanner'
import { lookupBarcode } from '../../api/barcode'
import { useReceive, useConsume } from '../../hooks/useMovements'
import BarcodeRegistration from '../../components/BarcodeRegistration'
import type { FilamentFamily } from '../../types'

type Step = 'scan' | 'register' | 'confirm'
type Intent = 'receive' | 'consume'

export default function ScanIntakeFlow() {
  const [step, setStep] = useState<Step>('scan')
  const [intent, setIntent] = useState<Intent>('receive')
  const [manual, setManual] = useState('')
  const [family, setFamily] = useState<FilamentFamily | null>(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const qtyRef = useRef<HTMLInputElement>(null)

  const receive = useReceive()
  const consume = useConsume()

  const { videoRef, error: cameraError, start, stop } = useScanner((code) => {
    // Auto-fill the manual input on detect; user still has to pick intent and tap Confirmar.
    setManual(code)
  })

  useEffect(() => {
    if (step === 'scan') {
      start()
      return () => stop()
    }
  }, [step, start, stop])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleConfirm = async () => {
    const code = manual.trim()
    if (!code) return
    setPending(true)
    setError(null)
    try {
      const result = await lookupBarcode(code)
      if (result.found) {
        setFamily(result.filament_family)
        setQty(1)
        setStep('confirm')
        setTimeout(() => qtyRef.current?.focus(), 50)
      } else {
        setStep('register')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al buscar el código')
    } finally {
      setPending(false)
    }
  }

  const handleRegistered = async () => {
    const result = await lookupBarcode(manual.trim())
    if (result.found) {
      setFamily(result.filament_family)
      setQty(1)
      setStep('confirm')
    } else {
      setStep('scan')
    }
  }

  const handleSubmitMovement = async () => {
    if (!family) return
    setError(null)
    try {
      if (intent === 'receive') {
        await receive.mutateAsync({ barcode: manual.trim(), quantity: qty })
        showToast(`✓ Ingresaron ${qty} × ${family.brand} ${family.material} ${family.brand_color_name}`)
      } else {
        if (qty > family.current_quantity) {
          setError(`Solo hay ${family.current_quantity} disponibles`)
          return
        }
        await consume.mutateAsync({ barcode: manual.trim(), quantity: qty })
        showToast(`✓ Consumieron ${qty} × ${family.brand} ${family.material} ${family.brand_color_name}`)
      }
      // Reset for the next scan.
      setStep('scan')
      setManual('')
      setFamily(null)
      setQty(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar el movimiento')
    }
  }

  return (
    <div className="flow-page scan-page">
      {toast && <div className="flow-toast">{toast}</div>}

      {step === 'scan' && (
        <>
          <div className="scan-camera">
            <video ref={videoRef} className="scan-video" autoPlay muted playsInline />
            <div className="scan-reticle" />
            {cameraError && <p className="scan-camera-error">{cameraError}</p>}
          </div>

          <div className="scan-controls">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Código manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="scan-controls__input"
              autoComplete="off"
            />

            <div className="scan-controls__intent" role="radiogroup" aria-label="Acción">
              <button
                type="button"
                role="radio"
                aria-checked={intent === 'receive'}
                className={`scan-intent-btn${intent === 'receive' ? ' is-active' : ''}`}
                onClick={() => setIntent('receive')}
              >Ingresar</button>
              <button
                type="button"
                role="radio"
                aria-checked={intent === 'consume'}
                className={`scan-intent-btn${intent === 'consume' ? ' is-active' : ''}`}
                onClick={() => setIntent('consume')}
              >Consumir</button>
            </div>

            <button
              type="button"
              className="btn btn--primary scan-controls__confirm"
              onClick={handleConfirm}
              disabled={!manual.trim() || pending}
            >
              {pending ? <span className="spinner" /> : 'Confirmar'}
            </button>
          </div>

          {error && <p className="flow-error">{error}</p>}
        </>
      )}

      {step === 'register' && (
        <BarcodeRegistration
          barcode={manual.trim()}
          onRegistered={handleRegistered}
          onClose={() => setStep('scan')}
        />
      )}

      {step === 'confirm' && family && (
        <div className="flow-confirm">
          <div className="scan-confirm-eyebrow">
            {intent === 'receive' ? 'Ingreso de stock' : 'Consumo de stock'}
          </div>
          <div className="flow-family-name">
            {family.brand} {family.material} {family.brand_color_name}
          </div>
          <div className="flow-stock-hint">
            Stock actual: <strong>{family.current_quantity}</strong>
            {family.is_low_stock && (
              <span className="pill pill--pending" style={{ marginLeft: 8 }}>Stock bajo</span>
            )}
          </div>

          {error && <p className="flow-error">{error}</p>}

          <label className="flow-qty-label">
            Cantidad a {intent === 'receive' ? 'ingresar' : 'consumir'}
          </label>
          <input
            ref={qtyRef}
            type="number"
            className="manual-input num"
            inputMode="numeric"
            min={1}
            max={intent === 'consume' ? family.current_quantity : undefined}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          />

          <div className="flow-actions">
            <button className="btn btn--ghost" onClick={() => setStep('scan')}>Cancelar</button>
            <button
              className="btn btn--primary btn--expand"
              onClick={handleSubmitMovement}
              disabled={receive.isPending || consume.isPending}
            >
              {(receive.isPending || consume.isPending) ? <span className="spinner" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
