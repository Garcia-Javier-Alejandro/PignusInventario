import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFamilies, createFamily, patchFamily } from '../api/families'
import type { FamiliesQuery, CreateFamilyBody, PatchFamilyBody } from '../api/families'

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  })
}
