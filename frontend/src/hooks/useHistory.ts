import { useQuery } from '@tanstack/react-query'
import { fetchTotalStockHistory, fetchFamilyStockHistory, fetchMonthlyHistory } from '../api/history'

export function useMonthlyHistory(months = 6) {
  return useQuery({
    queryKey: ['history', 'monthly', months],
    queryFn: () => fetchMonthlyHistory(months),
  })
}

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
