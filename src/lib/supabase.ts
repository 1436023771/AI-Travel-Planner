import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 环境变量未配置，某些功能可能无法使用')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  TRAVEL_PLANS: 'travel_plans',
  ITINERARY_ITEMS: 'itinerary_items',
  EXPENSES: 'expenses',
  USER_PREFERENCES: 'user_preferences',
} as const
