import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFamily, fetchFamilies, createFamily, patchFamily, fetchAlternatives, deleteFamily } from '../api/families'
import type { FamiliesQuery, CreateFamilyBody, PatchFamilyBody } from '../api/families'

export function useFamilyById(id: string) {
  return useQuery({
    queryKey: ['families', id],
    queryFn: () => fetchFamily(id),
  })
}

export function useAlternatives(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['families', id, 'alternatives'],
    queryFn: () => fetchAlternatives(id),
    enabled,
  })
}

export function useFamilies(query: FamiliesQuery = {}) {
  return useQuery({
    queryKey: ['families', query],
    queryFn: () => fetchFamilies(query),
    select: (data) => data.families,
  })
}

export function useCreateFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateFamilyBody) => createFamily(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  })
}

export function usePatchFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchFamilyBody }) => patchFamily(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFamily(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['barcodes'] })
    },
  })
}
