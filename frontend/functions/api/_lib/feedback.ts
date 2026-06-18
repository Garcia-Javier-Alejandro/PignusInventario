import { Hono } from 'hono'
import type { Env } from './types'
import { getUserEmail } from './auth'

async function sendEmail(apiKey: string, { to, subject, html }: { to: string; subject: string; html: string }) {
  if (!apiKey || !to || to === 'unknown' || !to.includes('@')) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Pignus <noreply@pignuslabs.com.ar>', to, subject, html }),
    })
    if (!res.ok) console.error(`[email] Resend error ${res.status}`)
  } catch (err: unknown) {
    console.error('[email] Failed:', (err as Error).message)
  }
}

function buildReceivedHtml({ type, screen, tried, expected, happened, impact, proposed_change, justification }: {
  type: string; screen: string | null; tried?: string | null; expected?: string | null;
  happened?: string | null; impact?: string | null; proposed_change?: string | null; justification?: string | null;
}) {
  const esc = (s: string | null | undefined) => s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
  const row = (label: string, val: string | null | undefined) => val ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e2d9;font-size:13px;color:#6b7280;width:150px;vertical-align:top">${label}</td><td style="padding:8px 0;border-bottom:1px solid #e8e2d9;font-size:13px;color:#1c1814;white-space:pre-wrap">${esc(val)}</td></tr>` : ''
  const typeLabel = type === 'bug' ? 'Problema' : 'Mejora'
  const detailRows = type === 'bug'
    ? row('¿Qué intentaste?', tried) + row('¿Qué esperabas?', expected) + row('¿Qué pasó?', happened) + row('Impacto', impact)
    : row('Cambio propuesto', proposed_change) + row('Justificación', justification)
  const tableRows = row('Tipo', typeLabel) + row('Pantalla', screen) + detailRows
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;color:#1c1814;"><table style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background:#1c1814;padding:24px 32px;"><p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a89880;">Pignus Inventario</p><h1 style="margin:4px 0 0;font-size:22px;font-weight:500;color:#f5f0e8;">Reporte recibido</h1></td></tr><tr><td style="padding:24px 32px;"><p style="margin:0 0 16px;font-size:15px;">Tu reporte fue recibido y será revisado próximamente.</p><table cellpadding="0" cellspacing="0" width="100%">${tableRows}</table></td></tr><tr><td style="padding:0 32px 32px;"><a href="https://inventario.pignuslabs.com.ar" style="display:inline-block;background:#1BBFA1;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-family:sans-serif;font-weight:600;">Abrir Inventario</a></td></tr><tr><td style="padding:16px 32px;background:#f5f0e8;border-top:1px solid #e8e2d9;"><p style="margin:0;font-size:11px;color:#9ca3af;font-family:sans-serif;">Este correo fue enviado automáticamente en respuesta a tu reporte.</p></td></tr></table></body></html>`
}

const feedback = new Hono<{ Bindings: Env }>()

feedback.post('/', async (c) => {
  const body = await c.req.json()
  const { type, screen, tried, expected, happened, impact, proposed_change, justification } = body

  if (type !== 'bug' && type !== 'feature_request') {
    return c.json({ error: 'VALIDATION_ERROR', message: 'type must be bug or feature_request' }, 400)
  }

  if (type === 'bug') {
    if (!tried?.trim()) return c.json({ error: 'VALIDATION_ERROR', message: 'tried is required' }, 400)
    if (!expected?.trim()) return c.json({ error: 'VALIDATION_ERROR', message: 'expected is required' }, 400)
    if (!happened?.trim()) return c.json({ error: 'VALIDATION_ERROR', message: 'happened is required' }, 400)
  } else {
    if (!proposed_change?.trim()) return c.json({ error: 'VALIDATION_ERROR', message: 'proposed_change is required' }, 400)
    if (!justification?.trim()) return c.json({ error: 'VALIDATION_ERROR', message: 'justification is required' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const reportedBy = getUserEmail(c)

  await c.env.DB.prepare(`
    INSERT INTO feedback_reports
      (id, type, screen, tried, expected, happened, impact, proposed_change, justification, reported_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    type,
    screen ?? null,
    tried ?? null,
    expected ?? null,
    happened ?? null,
    impact ?? null,
    proposed_change ?? null,
    justification ?? null,
    reportedBy,
    now,
  ).run()

  await sendEmail(c.env.RESEND_API_KEY, {
    to: reportedBy,
    subject: 'Reporte recibido — Pignus Inventario',
    html: buildReceivedHtml({ type, screen: screen ?? null, tried, expected, happened, impact, proposed_change, justification }),
  })

  return c.json({ ok: true })
})

export default feedback
