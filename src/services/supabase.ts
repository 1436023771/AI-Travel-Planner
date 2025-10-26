import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  TRAVEL_PLANS: 'travel_plans',
  ITINERARY_ITEMS: 'itinerary_items',
  EXPENSES: 'expenses',
  USER_PREFERENCES: 'user_preferences',
} as const;
