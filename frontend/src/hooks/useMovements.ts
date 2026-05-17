import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMovements, receiveStock, consumeStock, adjustStock } from '../api/movements'

export function useMovements(params: Parameters<typeof fetchMovements>[0] = {}) {
  return useQuery({
    queryKey: ['movements', params],
    queryFn: () => fetchMovements(params),
  })
}

export function useReceive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ barcode, quantity, notes }: { barcode: string; quantity: number; notes?: string }) =>
      receiveStock(barcode, quantity, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}

export function useConsume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ barcode, quantity, notes }: { barcode: string; quantity: number; notes?: string }) =>
      consumeStock(barcode, quantity, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}

export function useAdjust() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyId, delta, notes }: { familyId: string; delta: number; notes: string }) =>
      adjustStock(familyId, delta, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}
