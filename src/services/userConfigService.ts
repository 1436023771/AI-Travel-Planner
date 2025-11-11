import { supabase } from '@/lib/supabase'
import { encryption } from '@/utils/encryption'

export interface UserApiConfig {
  baichuanEndpoint?: string
  baichuanKey?: string
  baichuanModel?: string
  amapKey?: string
}

export const userConfigService = {
  // 获取用户配置
  async getUserConfig(userId: string): Promise<UserApiConfig | null> {
    try {
      const { data, error } = await supabase
        .from('user_api_config')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 记录不存在
          return null
        }
        throw error
      }

      if (!data) return null

      // 解密敏感字段
      return {
        baichuanEndpoint: data.baichuan_endpoint || '',
        baichuanKey: data.baichuan_key ? encryption.decode(data.baichuan_key) : '',
        baichuanModel: data.baichuan_model || '',
        amapKey: data.amap_key ? encryption.decode(data.amap_key) : '',
      }
    } catch (e) {
      console.error('获取用户配置失败', e)
      return null
    }
  },

  // 保存用户配置
  async saveUserConfig(userId: string, config: UserApiConfig): Promise<void> {
    try {
      // 加密敏感字段
      const encryptedConfig = {
        user_id: userId,
        baichuan_endpoint: config.baichuanEndpoint || null,
        baichuan_key: config.baichuanKey ? encryption.encode(config.baichuanKey) : null,
        baichuan_model: config.baichuanModel || null,
        amap_key: config.amapKey ? encryption.encode(config.amapKey) : null,
        updated_at: new Date().toISOString(),
      }

      // 尝试更新，如果不存在则插入
      const { error: updateError } = await supabase
        .from('user_api_config')
        .update(encryptedConfig)
        .eq('user_id', userId)

      if (updateError) {
        // 如果更新失败（记录不存在），则插入
        const { error: insertError } = await supabase
          .from('user_api_config')
          .insert([encryptedConfig])

        if (insertError) {
          throw insertError
        }
      }

      console.log('✅ 用户配置已保存到 Supabase')
    } catch (e) {
      console.error('保存用户配置失败', e)
      throw e
    }
  },

  // 删除用户配置
  async deleteUserConfig(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_api_config')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      console.log('✅ 用户配置已删除')
    } catch (e) {
      console.error('删除用户配置失败', e)
      throw e
    }
  },
}
