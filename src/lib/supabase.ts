import { createClient } from '@supabase/supabase-js'
import { configManager } from '@/utils/configManager'

// 使用配置管理器获取配置
const supabaseUrl = configManager.getSupabaseUrl()
const supabaseAnonKey = configManager.getSupabaseKey()

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 配置缺失，请在首页配置或检查 .env.local 文件')
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
