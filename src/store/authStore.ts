import { create } from 'zustand';
import { authService } from '@/services/auth';
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth';

interface AuthStore {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(credentials);
      set({ 
        user: data.user as any,
        session: data.session,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || '登录失败',
        loading: false 
      });
      throw error;
    }
  },

  register: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.register(credentials);
      set({ 
        user: data.user as any,
        session: data.session,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || '注册失败',
        loading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authService.logout();
      set({ 
        user: null,
        session: null,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || '登出失败',
        loading: false 
      });
      throw error;
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const session = await authService.getSession();
      const user = await authService.getCurrentUser();
      set({ 
        user: user as any,
        session,
        loading: false 
      });
    } catch (error) {
      set({ 
        user: null,
        session: null,
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
