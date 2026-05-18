import { useRef, useCallback, useState, useEffect } from 'react'

const BARCODE_FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code',
  'code_128', 'code_39', 'code_93', 'data_matrix', 'pdf417',
]

// Require this many consecutive identical detections before accepting a
// barcode. Eliminates one-frame misdecodes that pass the checksum coincidentally.
const REQUIRED_CONSECUTIVE = 2

export function useScanner(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const onDetectedRef = useRef(onDetected)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { onDetectedRef.current = onDetected })

  const stop = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setActive(true)

    let streak: { code: string; count: number } | null = null
    const consume = (code: string): boolean => {
      if (streak?.code === code) {
        streak.count += 1
      } else {
        streak = { code, count: 1 }
      }
      if (streak.count >= REQUIRED_CONSECUTIVE) {
        onDetectedRef.current(code)
        return true
      }
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      if ('BarcodeDetector' in window) {
        // Native API — Chrome Android, Chrome desktop
        const detector = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: BARCODE_FORMATS })
        const scan = async () => {
          if (!streamRef.current) return
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0 && consume(codes[0].rawValue)) return
          } catch {}
          rafRef.current = requestAnimationFrame(() => { scan() })
        }
        scan()
      } else {
        // Fallback — zxing canvas loop (iOS Safari, Firefox)
        const { MultiFormatReader, BinaryBitmap, HybridBinarizer, HTMLCanvasElementLuminanceSource } =
          await import('@zxing/library')
        const reader = new MultiFormatReader()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const scan = () => {
          if (!streamRef.current) return
          if (video.readyState >= 2 && video.videoWidth > 0) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            try {
              const src = new HTMLCanvasElementLuminanceSource(canvas)
              const result = reader.decode(new BinaryBitmap(new HybridBinarizer(src)))
              if (result && consume(result.getText())) return
            } catch { /* NotFoundException is normal when no barcode in frame */ }
          }
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      }
    } catch {
      setError('No se pudo acceder a la cámara')
      setActive(false)
    }
  }, [])

  return { videoRef, active, error, start, stop }
}
