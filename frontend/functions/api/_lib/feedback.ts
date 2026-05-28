import { Hono } from 'hono'
import type { Env } from './types'
import { getUserEmail } from './auth'

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
    getUserEmail(c),
    now,
  ).run()

  return c.json({ ok: true })
})

export default feedback
