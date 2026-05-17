import { useRef, useCallback, useState, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export function useScanner(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const onDetectedRef = useRef(onDetected)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { onDetectedRef.current = onDetected })

  const start = useCallback(async () => {
    setError(null)
    setActive(true)
    const reader = new BrowserMultiFormatReader()
    try {
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (result) {
            onDetectedRef.current(result.getText())
          } else if (err && err.name !== 'NotFoundException') {
            setError('Error de cámara')
          }
        }
      )
      controlsRef.current = controls
    } catch {
      setError('No se pudo acceder a la cámara')
      setActive(false)
    }
  }, [])

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setActive(false)
  }, [])

  return { videoRef, active, error, start, stop }
}
