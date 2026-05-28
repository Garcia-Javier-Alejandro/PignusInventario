import { api } from './client'

export interface FeedbackPayload {
  type: 'bug' | 'feature_request'
  screen: string
  tried?: string
  expected?: string
  happened?: string
  impact?: string
  proposed_change?: string
  justification?: string
}

export function submitFeedback(payload: FeedbackPayload): Promise<{ ok: true }> {
  return api.post('/api/feedback', payload)
}
