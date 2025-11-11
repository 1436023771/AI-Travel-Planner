import { userConfigService, type UserApiConfig } from '@/services/userConfigService'

interface AppConfig {
  supabaseUrl: string
  supabaseKey: string
  baichuanEndpoint: string
  baichuanKey: string
  baichuanModel: string
  amapKey: string
}

class ConfigManager {
  private config: AppConfig | null = null
  private envConfig: AppConfig | null = null
  private userConfig: UserApiConfig | null = null
  private currentUserId: string | null = null

  private getEnvConfig(): AppConfig {
    if (this.envConfig) return this.envConfig
    this.envConfig = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      baichuanEndpoint: import.meta.env.VITE_BAICHUAN_ENDPOINT || '',
      baichuanKey: import.meta.env.VITE_BAICHUAN_API_KEY || '',
      baichuanModel: import.meta.env.VITE_BAICHUAN_MODEL || 'qwen-turbo',
      amapKey: import.meta.env.VITE_AMAP_KEY || '',
    }
    return this.envConfig
  }

  // 从 Supabase 加载用户配置
  async loadUserConfig(userId: string): Promise<void> {
    if (this.currentUserId === userId && this.userConfig) {
      return // 已加载
    }

    this.currentUserId = userId
    this.userConfig = await userConfigService.getUserConfig(userId)
    
    if (this.userConfig) {
      console.log('✅ 已从 Supabase 加载用户配置')
      this.config = null // 重置缓存
      this.init() // 重新初始化
    }
  }

  // 初始化配置（重启后优先云端配置，否则环境变量）
  init(): AppConfig {
    // 优先使用已加载的 Supabase 用户配置
    if (this.userConfig) {
      const envConfig = this.getEnvConfig()
      this.config = { ...envConfig }
      Object.keys(this.userConfig).forEach(key => {
        const value = (this.userConfig as any)[key]
        if (value && value.trim() !== '') {
          const configKey = this.mapUserConfigKey(key)
          if (configKey) {
            (this.config as any)[configKey] = value
          }
        }
      })
      return this.config
    }

    // 如果没有用户配置，尝试从 localStorage 加载（兼容旧逻辑）
    const savedConfig = localStorage.getItem('api_config')
    const envConfig = this.getEnvConfig()
    if (savedConfig) {
      try {
        const userConfig = JSON.parse(savedConfig)
        this.config = { ...envConfig }
        Object.keys(userConfig).forEach(key => {
          const value = userConfig[key]
          if (value && value.trim() !== '') {
            (this.config as any)[key] = value
          }
        })
        return this.config!
      } catch (e) {
        console.warn('解析本地配置失败，使用环境变量', e)
      }
    }

    // 默认使用环境变量
    this.config = envConfig
    return this.config
  }

  // 映射用户配置字段名到配置对象字段名
  private mapUserConfigKey(key: string): string | null {
    const mapping: Record<string, string> = {
      baichuanEndpoint: 'baichuanEndpoint',
      baichuanKey: 'baichuanKey',
      baichuanModel: 'baichuanModel',
      amapKey: 'amapKey',
    }
    return mapping[key] || null
  }

  // 保存配置到 Supabase
  async saveToSupabase(userId: string, config: Partial<UserApiConfig>): Promise<void> {
    const envConfig = this.getEnvConfig()
    
    // 只保存非空且与环境变量不同的值
    const userOnlyConfig: UserApiConfig = {}
    
    if (config.baichuanEndpoint && config.baichuanEndpoint !== envConfig.baichuanEndpoint) {
      userOnlyConfig.baichuanEndpoint = config.baichuanEndpoint
    }
    if (config.baichuanKey && config.baichuanKey !== envConfig.baichuanKey) {
      userOnlyConfig.baichuanKey = config.baichuanKey
    }
    if (config.baichuanModel && config.baichuanModel !== envConfig.baichuanModel) {
      userOnlyConfig.baichuanModel = config.baichuanModel
    }
    if (config.amapKey && config.amapKey !== envConfig.amapKey) {
      userOnlyConfig.amapKey = config.amapKey
    }
    
    await userConfigService.saveUserConfig(userId, userOnlyConfig)
    
    // 更新内存中的配置
    this.userConfig = userOnlyConfig
    this.config = null
    this.init()
  }

  // 清除用户配置
  async clearUserConfig(userId: string): Promise<void> {
    await userConfigService.deleteUserConfig(userId)
    this.userConfig = null
    this.currentUserId = null
    this.config = null
    this.init()
  }

  // 获取当前配置
  get(): AppConfig {
    return this.init()
  }

  // 获取用于显示的配置
  getForDisplay(): AppConfig {
    return this.init()
  }

  // 获取特定配置项
  getSupabaseUrl(): string { return this.init().supabaseUrl }
  getSupabaseKey(): string { return this.init().supabaseKey }
  getBaichuanEndpoint(): string { return this.init().baichuanEndpoint }
  getBaichuanKey(): string { return this.init().baichuanKey }
  getBaichuanModel(): string { return this.init().baichuanModel }
  getAmapKey(): string { return this.init().amapKey }
}

export const configManager = new ConfigManager()
