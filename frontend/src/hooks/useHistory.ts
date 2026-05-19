import { useQuery } from '@tanstack/react-query'
import { fetchTotalStockHistory, fetchFamilyStockHistory } from '../api/history'

export function useTotalStockHistory(days = 30) {
  return useQuery({
    queryKey: ['history', 'total-stock', days],
    queryFn: () => fetchTotalStockHistory(days),
  })
}

export function useFamilyStockHistory(id: string, days = 30) {
  return useQuery({
    queryKey: ['history', 'family', id, days],
    queryFn: () => fetchFamilyStockHistory(id, days),
    enabled: Boolean(id),
  })
}
