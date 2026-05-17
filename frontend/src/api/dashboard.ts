import { api } from './client'
import type { DashboardSummary } from '../types'

export function fetchDashboard(): Promise<DashboardSummary> {
  return api.get('/api/inventory/dashboard')
}
