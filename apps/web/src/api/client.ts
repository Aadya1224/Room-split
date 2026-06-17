import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

// ─── Base instance ─────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,   // send httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor – attach access token ────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor – silent token refresh on 401 ──────────────────────
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token?: string) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only retry on 401, only once, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/login'
    ) {
      if (isRefreshing) {
        // Queue concurrent requests while a refresh is in flight
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers!.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<{ success: true; data: { accessToken: string } }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        const newToken = res.data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed → log the user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Typed convenience wrappers ───────────────────────────────────────────────
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ success: true; data: T }>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.post<{ success: true; data: T }>(url, data);
  return res.data.data;
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.patch<{ success: true; data: T }>(url, data);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await apiClient.delete<{ success: true; data: T }>(url);
  return res.data.data;
}
