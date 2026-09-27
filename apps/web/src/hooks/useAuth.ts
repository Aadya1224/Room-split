import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/routes';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/utils';

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  me: ['auth', 'me'] as const,
};

// ─── useMe ────────────────────────────────────────────────────────────────────
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: authKeys.me,
    queryFn:  authApi.me,
    enabled:  !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── useRegister ──────────────────────────────────────────────────────────────
export function useRegister() {
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      qc.setQueryData(authKeys.me, data.user);
      toast.success(`Welcome, ${data.user.name}! 🎉`);
      navigate('/dashboard');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

// ─── useLogin ─────────────────────────────────────────────────────────────────
export function useLogin() {
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      qc.setQueryData(authKeys.me, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

// ─── useLogout ────────────────────────────────────────────────────────────────
export function useLogout() {
  const { logout } = useAuthStore();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      qc.clear();
      navigate('/login');
    },
  });
}

// ─── useUpdateProfile ─────────────────────────────────────────────────────────
export function useUpdateProfile() {
  const { setUser } = useAuthStore();
  const qc          = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (user) => {
      setUser(user);
      qc.setQueryData(authKeys.me, user);
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
