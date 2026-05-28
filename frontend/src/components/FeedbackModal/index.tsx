import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '../../api/feedback'

interface Props {
  initialScreen: string
  onClose: () => void
}

type Mode = 'bug' | 'feature_request'

export default function FeedbackModal({ initialScreen, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('bug')
  const [screen, setScreen] = useState(initialScreen)
  const [tried, setTried] = useState('')
  const [expected, setExpected] = useState('')
  const [happened, setHappened] = useState('')
  const [impact, setImpact] = useState('')
  const [proposedChange, setProposedChange] = useState('')
  const [justification, setJustification] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)

  const submit = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      setDone(true)
      setTimeout(onClose, 1500)
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function validate() {
    const errs: Record<string, string> = {}
    if (mode === 'bug') {
      if (!tried.trim()) errs.tried = 'Este campo es requerido'
      if (!expected.trim()) errs.expected = 'Este campo es requerido'
      if (!happened.trim()) errs.happened = 'Este campo es requerido'
    } else {
      if (!proposedChange.trim()) errs.proposedChange = 'Este campo es requerido'
      if (!justification.trim()) errs.justification = 'Este campo es requerido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (mode === 'bug') {
      submit.mutate({ type: 'bug', screen, tried, expected, happened, impact: impact || undefined })
    } else {
      submit.mutate({ type: 'feature_request', screen, proposed_change: proposedChange, justification })
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setErrors({})
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {mode === 'bug' ? 'Reportar un problema' : 'Sugerir una mejora'}
          </span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {done ? (
          <p className="modal-stock feedback-success">Reporte enviado con éxito</p>
        ) : (
          <>
            <div className="scan-intent-toolbar feedback-mode-toggle" role="radiogroup" aria-label="Tipo de reporte">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'bug'}
                className={`scan-intent-btn${mode === 'bug' ? ' is-active' : ''}`}
                onClick={() => switchMode('bug')}
              >
                Problema
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'feature_request'}
                className={`scan-intent-btn${mode === 'feature_request' ? ' is-active' : ''}`}
                onClick={() => switchMode('feature_request')}
              >
                Mejora
              </button>
            </div>

            <div className="family-form">
              <div className="family-form__field">
                <label htmlFor="fb-screen">Pantalla</label>
                <input
                  id="fb-screen"
                  type="text"
                  value={screen}
                  onChange={(e) => setScreen(e.target.value)}
                />
              </div>

              {mode === 'bug' ? (
                <>
                  <div className="family-form__field">
                    <label htmlFor="fb-tried">
                      ¿Qué intentaste hacer? <span className="feedback-required">*</span>
                    </label>
                    <textarea
                      id="fb-tried"
                      rows={2}
                      value={tried}
                      onChange={(e) => setTried(e.target.value)}
                    />
                    {errors.tried && <span className="feedback-field-error">{errors.tried}</span>}
                  </div>

                  <div className="family-form__field">
                    <label htmlFor="fb-expected">
                      ¿Qué esperabas que pasara? <span className="feedback-required">*</span>
                    </label>
                    <textarea
                      id="fb-expected"
                      rows={2}
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                    />
                    {errors.expected && <span className="feedback-field-error">{errors.expected}</span>}
                  </div>

                  <div className="family-form__field">
                    <label htmlFor="fb-happened">
                      ¿Qué pasó en realidad? <span className="feedback-required">*</span>
                    </label>
                    <textarea
                      id="fb-happened"
                      rows={2}
                      value={happened}
                      onChange={(e) => setHappened(e.target.value)}
                    />
                    {errors.happened && <span className="feedback-field-error">{errors.happened}</span>}
                  </div>

                  <div className="family-form__field">
                    <label htmlFor="fb-impact">
                      ¿Por qué es un problema? <span className="feedback-optional">(opcional)</span>
                    </label>
                    <textarea
                      id="fb-impact"
                      rows={2}
                      value={impact}
                      onChange={(e) => setImpact(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="family-form__field">
                    <label htmlFor="fb-proposed">
                      ¿Qué cambio implementarías? <span className="feedback-required">*</span>
                    </label>
                    <textarea
                      id="fb-proposed"
                      rows={3}
                      value={proposedChange}
                      onChange={(e) => setProposedChange(e.target.value)}
                    />
                    {errors.proposedChange && <span className="feedback-field-error">{errors.proposedChange}</span>}
                  </div>

                  <div className="family-form__field">
                    <label htmlFor="fb-justification">
                      ¿Por qué mejoraría la app? <span className="feedback-required">*</span>
                    </label>
                    <textarea
                      id="fb-justification"
                      rows={3}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    />
                    {errors.justification && <span className="feedback-field-error">{errors.justification}</span>}
                  </div>
                </>
              )}
            </div>

            {submit.isError && (
              <p className="flow-error" style={{ marginTop: 'var(--space-3)' }}>
                {submit.error instanceof Error ? submit.error.message : 'Error al enviar el reporte'}
              </p>
            )}

            <div className="flow-actions" style={{ marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary btn--expand"
                onClick={handleSubmit}
                disabled={submit.isPending}
              >
                {submit.isPending ? <span className="spinner" /> : 'Enviar reporte'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
