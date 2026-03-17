import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company, AuthState } from '../types';
import { api } from '../services/api';

interface AuthStore extends AuthState {
  // Actions
  setAuth: (token: string, user: User, company?: Company) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  updateCompany: (company: Company) => void;
  
  // Async actions
  initialize: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      company: null,
      isAuthenticated: false,

      setAuth: (token, user, company) => {
        set({ token, user, company, isAuthenticated: true });
      },

      clearAuth: () => {
        api.logout();
        set({ token: null, user: null, company: null, isAuthenticated: false });
      },

      updateUser: (user) => {
        set({ user });
      },

      updateCompany: (company) => {
        set({ company });
      },

      initialize: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await api.getMe();
          if (response.success && response.data) {
            set({
              user: response.data.user,
              company: response.data.company || null,
              token,
              isAuthenticated: true,
            });
          } else {
            get().clearAuth();
          }
        } catch {
          get().clearAuth();
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        try {
          const response = await api.changePassword({ currentPassword, newPassword });
          if (response.success) {
            // Update user to reflect password changed
            const { user } = get();
            if (user) {
              set({
                user: { ...user, mustChangePassword: false }
              });
            }
            return { success: true };
          }
          return { success: false, error: response.error || 'Failed to change password' };
        } catch (error: any) {
          return { 
            success: false, 
            error: error.response?.data?.error || 'Failed to change password' 
          };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
