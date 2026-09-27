import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPublic } from '@roomsplit/types';

interface AuthState {
  accessToken: string | null;
  user:        UserPublic | null;
  isHydrated:  boolean;

  setAccessToken: (token: string) => void;
  setUser:        (user: UserPublic) => void;
  login:          (token: string, user: UserPublic) => void;
  logout:         () => void;
  setHydrated:    () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user:        null,
      isHydrated:  false,

      setAccessToken: (token) => set({ accessToken: token }),
      setUser:        (user)  => set({ user }),

      login: (token, user) => set({ accessToken: token, user }),

      logout: () => {
        set({ accessToken: null, user: null });
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name:    'roomsplit-auth',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage: cleared on tab close
      partialize: (state) => ({ user: state.user }),    // DON'T persist the token itself
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
