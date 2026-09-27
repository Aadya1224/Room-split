import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { feedbackApi, notificationsApi } from '@/api/routes';
import { getErrorMessage } from '@/lib/utils';

export const notificationKeys = { all: ['notifications'] as const };

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.all, queryFn: notificationsApi.list, staleTime: 15_000, refetchInterval: 30_000 });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: notificationsApi.markRead, onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }), onError: (e) => toast.error(getErrorMessage(e)) });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }), onError: (e) => toast.error(getErrorMessage(e)) });
}

export function useSubmitFeedback() {
  return useMutation({ mutationFn: feedbackApi.create, onSuccess: () => toast.success('Thanks for your feedback!'), onError: (e) => toast.error(getErrorMessage(e)) });
}
