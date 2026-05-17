import { useState, useRef } from 'react'
import { useReceive } from '../../hooks/useMovements'
import { lookupBarcode } from '../../api/barcode'
import Scanner from '../../components/Scanner'
import BarcodeRegistration from '../../components/BarcodeRegistration'
import type { FilamentFamily } from '../../types'

type Step = 'scanner' | 'register' | 'confirm'

export default function ReceiveFlow() {
  const [step, setStep] = useState<Step>('scanner')
  const [family, setFamily] = useState<FilamentFamily | null>(null)
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const receive = useReceive()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleBarcode = async (code: string) => {
    setBarcode(code)
    const result = await lookupBarcode(code)
    if (result.found) {
      setFamily(result.filament_family)
      setStep('confirm')
      setTimeout(() => quantityRef.current?.select(), 50)
    } else {
      setStep('register')
    }
  }

  const handleRegistered = async () => {
    const result = await lookupBarcode(barcode)
    if (result.found) {
      setFamily(result.filament_family)
      setStep('confirm')
    }
  }

  const handleConfirm = async () => {
    if (!family) return
    await receive.mutateAsync({ barcode, quantity })
    showToast(`✓ ${quantity} × ${family.brand} ${family.material} ${family.brand_color_name}`)
    setFamily(null)
    setBarcode('')
    setQuantity(1)
    setStep('scanner')
  }

  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">Recibir mercadería</span>
      </div>

      {toast && <div className="flow-toast">{toast}</div>}

      {step === 'scanner' && (
        <Scanner onDetected={handleBarcode} onClose={() => {}} />
      )}

      {step === 'register' && (
        <BarcodeRegistration
          barcode={barcode}
          onRegistered={handleRegistered}
          onClose={() => setStep('scanner')}
        />
      )}

      {step === 'confirm' && family && (
        <div className="flow-confirm">
          <div className="flow-family-name">
            {family.brand} {family.material} {family.brand_color_name}
          </div>
          <div className="flow-stock-hint">
            Stock actual: <strong>{family.current_quantity}</strong>
          </div>

          <label className="flow-qty-label">Cantidad a recibir</label>
          <input
            ref={quantityRef}
            type="number"
            className="manual-input num"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />

          <div className="flow-actions">
            <button className="btn btn--ghost" onClick={() => setStep('scanner')}>Cancelar</button>
            <button
              className="btn btn--primary btn--expand"
              onClick={handleConfirm}
              disabled={receive.isPending}
            >
              {receive.isPending ? <span className="spinner" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
