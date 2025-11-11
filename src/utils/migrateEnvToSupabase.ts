import { userConfigService } from '@/services/userConfigService'

/**
 * 迁移环境变量配置到 Supabase
 * 这个函数会在用户首次登录后自动执行
 */
export async function migrateEnvToSupabase(userId: string): Promise<boolean> {
  try {
    // 检查是否已经迁移过
    const existingConfig = await userConfigService.getUserConfig(userId)
    if (existingConfig && (existingConfig.baichuanKey || existingConfig.amapKey)) {
      console.log('✅ 配置已存在，跳过迁移')
      return false
    }

    // 从环境变量读取配置
    const envConfig = {
      baichuanEndpoint: import.meta.env.VITE_BAICHUAN_ENDPOINT || '',
      baichuanKey: import.meta.env.VITE_BAICHUAN_API_KEY || '',
      baichuanModel: import.meta.env.VITE_BAICHUAN_MODEL || 'qwen-turbo',
      amapKey: import.meta.env.VITE_AMAP_KEY || '',
    }

    // 如果环境变量中有配置，则迁移到 Supabase
    if (envConfig.baichuanKey || envConfig.amapKey) {
      await userConfigService.saveUserConfig(userId, envConfig)
      console.log('✅ 环境变量配置已迁移到 Supabase')
      return true
    }

    console.log('ℹ️ 环境变量中无配置需要迁移')
    return false
  } catch (e) {
    console.error('❌ 迁移失败:', e)
    return false
  }
}
