import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { groupsApi } from '@/api/routes';
import { getErrorMessage } from '@/lib/utils';

export const groupKeys = {
  all:    ['groups'] as const,
  detail: (id: string) => ['groups', id] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.all,
    queryFn:  groupsApi.list,
    staleTime: 60_000,
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn:  () => groupsApi.get(groupId),
    enabled:  !!groupId,
    staleTime: 30_000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      toast.success(`Group "${group.name}" created!`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string }) => groupsApi.update(groupId, data),
    onSuccess: (group) => {
      qc.setQueryData(groupKeys.detail(groupId), group);
      qc.invalidateQueries({ queryKey: groupKeys.all });
      toast.success('Group updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.delete(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      toast.success('Group deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => groupsApi.join(inviteCode),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      toast.success(`Joined "${group.name}"!`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
