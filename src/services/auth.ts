import { supabase } from './supabase';
import type { LoginCredentials, RegisterCredentials, User } from '@/types/auth';

export const authService = {
  // 注册
  async register(credentials: RegisterCredentials) {
    const { email, password } = credentials;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // 登录
  async login(credentials: LoginCredentials) {
    const { email, password } = credentials;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // 登出
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 获取当前用户
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // 获取当前会话
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // 重置密码
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // 更新密码
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
