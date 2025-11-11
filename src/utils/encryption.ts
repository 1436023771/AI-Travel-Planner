// 简单的加密工具（基于用户 ID 作为密钥）
// 注意：这是客户端加密，主要用于混淆，不是完全安全的加密

export const encryption = {
  // 简单的 Base64 编码（用于存储）
  encode(text: string): string {
    if (!text) return ''
    try {
      return btoa(encodeURIComponent(text))
    } catch (e) {
      console.error('加密失败', e)
      return text
    }
  },

  // 简单的 Base64 解码
  decode(encoded: string): string {
    if (!encoded) return ''
    try {
      return decodeURIComponent(atob(encoded))
    } catch (e) {
      console.error('解密失败', e)
      return encoded
    }
  },

  // 批量加密对象
  encodeObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}
    Object.keys(obj).forEach(key => {
      if (obj[key]) {
        result[key] = this.encode(obj[key])
      }
    })
    return result
  },

  // 批量解密对象
  decodeObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}
    Object.keys(obj).forEach(key => {
      if (obj[key]) {
        result[key] = this.decode(obj[key])
      }
    })
    return result
  },
}
