import type { TravelPlan, CreatePlanInput } from '@/types/plan'

const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'baichuan').toLowerCase()

const BAICHUAN_ENDPOINT = import.meta.env.VITE_BAICHUAN_ENDPOINT || ''
const BAICHUAN_API_KEY = import.meta.env.VITE_BAICHUAN_API_KEY || ''
const BAICHUAN_MODEL = import.meta.env.VITE_BAICHUAN_MODEL || ''

const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

function buildPrompt(input: CreatePlanInput) {
  const days = Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return `你是专业的旅行规划师。请根据用户信息输出 JSON 格式的旅行计划。

严格要求：
1. 仅输出 JSON，不要任何前后文字说明
2. 每天安排 2-4 个行程项
3. 描述精简（每项15字内）
4. **必须包含真实准确的经纬度坐标**（location_lat 和 location_lng）
5. type 只能是：transport、accommodation、attraction、restaurant 之一
6. 时间格式：HH:mm（如 "09:00"）

JSON 示例：
{
  "title": "${input.destination}${days}日游",
  "destination": "${input.destination}",
  "start_date": "${input.startDate}",
  "end_date": "${input.endDate}",
  "budget": ${input.budget || 10000},
  "travelers": ${input.travelers},
  "preferences": {},
  "itinerary_items": [
    {
      "day": 1,
      "type": "attraction",
      "title": "天安门广场",
      "description": "参观天安门",
      "location_lat": 39.9042,
      "location_lng": 116.4074,
      "address": "北京市东城区",
      "time_start": "09:00",
      "time_end": "11:00",
      "estimated_cost": 0,
      "order_index": 0
    },
    {
      "day": 1,
      "type": "restaurant",
      "title": "全聚德烤鸭",
      "description": "品尝北京烤鸭",
      "location_lat": 39.9163,
      "location_lng": 116.4049,
      "address": "前门大街",
      "time_start": "12:00",
      "time_end": "13:30",
      "estimated_cost": 200,
      "order_index": 1
    }
  ]
}

用户需求：
目的地: ${input.destination}
日期: ${input.startDate} 至 ${input.endDate}（共${days}天）
预算: ${input.budget || '不限'}元
人数: ${input.travelers}人
偏好: ${input.preferences || '无特殊要求'}

请根据${input.destination}的实际景点，生成包含真实经纬度坐标的完整行程 JSON：`
}

async function tryBaichuanCall(prompt: string) {
  if (!BAICHUAN_ENDPOINT || !BAICHUAN_API_KEY) {
    return { ok: false, reason: 'missing_config' as const }
  }

  const isChatEndpoint = /chat|completions/i.test(BAICHUAN_ENDPOINT)

  const candidates: any[] = []

  if (isChatEndpoint) {
    if (!BAICHUAN_MODEL) {
      return { ok: false, reason: 'missing_model' as const }
    }
    candidates.push({
      model: BAICHUAN_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // 降低温度提高确定性
      max_tokens: 8000, // 大幅增加 token 限制
    })
  }

  candidates.push(
    { prompt, max_tokens: 8000, temperature: 0.1 },
    { input: prompt, max_tokens: 8000, temperature: 0.1 },
    { messages: [{ role: 'user', content: prompt }], max_tokens: 8000, temperature: 0.1 },
  )

  let lastError: { status?: number; text?: string } | null = null

  for (const body of candidates) {
    try {
      const resp = await fetch(BAICHUAN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BAICHUAN_API_KEY}`,
        },
        body: JSON.stringify(body),
      })

      const text = await resp.text()
      if (resp.ok) {
        return { ok: true as const, text }
      } else {
        lastError = { status: resp.status, text }
      }
    } catch (e: any) {
      lastError = { text: String(e) }
    }
  }

  return { ok: false as const, reason: 'request_failed' as const, error: lastError }
}

function extractContentFromBaichuanText(text: string) {
  try {
    const parsed = JSON.parse(text)
    const content =
      parsed?.choices?.[0]?.text ||
      parsed?.choices?.[0]?.message?.content ||
      parsed?.result ||
      (typeof parsed === 'string' ? parsed : null)

    if (typeof content === 'string') return { content, parsed }
    if (parsed && typeof parsed === 'object' && parsed.itinerary_items) {
      return { content: JSON.stringify(parsed), parsed }
    }
    return { content: JSON.stringify(parsed), parsed }
  } catch {
    return { content: text, parsed: null }
  }
}

// 检测 JSON 是否被截断
function isJsonTruncated(jsonStr: string): boolean {
  // 简单检测：统计 { } [ ] 是否匹配
  let braceCount = 0
  let bracketCount = 0
  
  for (const char of jsonStr) {
    if (char === '{') braceCount++
    if (char === '}') braceCount--
    if (char === '[') bracketCount++
    if (char === ']') bracketCount--
  }
  
  return braceCount !== 0 || bracketCount !== 0
}

// 尝试修复截断的 JSON
function tryFixTruncatedJson(jsonStr: string): string {
  let fixed = jsonStr.trim()
  
  // 计算缺少的闭合符号
  let braceCount = 0
  let bracketCount = 0
  
  for (const char of fixed) {
    if (char === '{') braceCount++
    if (char === '}') braceCount--
    if (char === '[') bracketCount++
    if (char === ']') bracketCount--
  }
  
  // 添加缺失的闭合符号
  while (bracketCount > 0) {
    fixed += ']'
    bracketCount--
  }
  while (braceCount > 0) {
    fixed += '}'
    braceCount--
  }
  
  return fixed
}

/** 通用返回结构：{ plan: Partial<TravelPlan> | null, raw: string } */
export const aiService = {
  async generateItinerary(input: CreatePlanInput): Promise<{ plan: Partial<TravelPlan> | null; raw: string }> {
    const prompt = buildPrompt(input)

    if (LLM_PROVIDER === 'baichuan') {
      const resp = await tryBaichuanCall(prompt)
      if (resp.ok) {
        const { text } = resp
        const { content } = extractContentFromBaichuanText(text)
        
        // 尝试解析 content 为 JSON plan
        try {
          const parsedPlan = JSON.parse(content)
          return { plan: parsedPlan as Partial<TravelPlan>, raw: content }
        } catch (parseError) {
          // JSON 解析失败，检查是否被截断
          console.warn('JSON 解析失败，尝试修复截断...', parseError)
          
          if (isJsonTruncated(content)) {
            const fixed = tryFixTruncatedJson(content)
            try {
              const parsedPlan = JSON.parse(fixed)
              console.log('✅ JSON 修复成功')
              return { plan: parsedPlan as Partial<TravelPlan>, raw: `${content}\n\n[已自动修复截断]` }
            } catch {
              console.error('❌ JSON 修复失败')
              return { plan: null, raw: `${content}\n\n[JSON 被截断且无法自动修复]` }
            }
          }
          
          // 不是截断问题，返回原始文本
          return { plan: null, raw: content }
        }
      } else {
        if (resp.reason === 'missing_config') {
          const msg = 'Baichuan 配置缺失（VITE_BAICHUAN_ENDPOINT/VITE_BAICHUAN_API_KEY）。'
          if (!OPENAI_KEY) throw new Error(msg + ' 且未配置 OpenAI 回退。')
          console.warn(msg + ' 尝试 OpenAI 回退。')
        } else if (resp.reason === 'missing_model') {
          const msg = 'Baichuan 端点需要 model 参数（VITE_BAICHUAN_MODEL 未配置）。请在 .env.local 中设置 VITE_BAICHUAN_MODEL。'
          if (!OPENAI_KEY) throw new Error(msg + ' 且未配置 OpenAI 回退。')
          console.warn(msg + ' 尝试 OpenAI 回退。')
        } else {
          const errInfo = resp.error ? `status=${resp.error.status} body=${resp.error.text}` : 'unknown error'
          if (!OPENAI_KEY) {
            throw new Error(`Baichuan 请求失败，且未配置 OpenAI 回退。详细信息：${errInfo}`)
          } else {
            console.warn('Baichuan 请求失败，尝试使用 OpenAI 回退。详情：', errInfo)
          }
        }
      }
    }

    if (OPENAI_KEY) {
      try {
        const body = {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: '你是专业的旅行规划师。输出仅为完整 JSON，描述简洁。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 8000, // 增加 OpenAI token 限制
        }

        const resp = await fetch(`${OPENAI_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!resp.ok) {
          const t = await resp.text()
          throw new Error(`OpenAI error: ${resp.status} ${t}`)
        }

        const data = await resp.json()
        const content = data.choices?.[0]?.message?.content ?? ''
        
        try {
          const parsed = JSON.parse(content)
          return { plan: parsed as Partial<TravelPlan>, raw: content }
        } catch (parseError) {
          // 尝试修复截断
          if (isJsonTruncated(content)) {
            const fixed = tryFixTruncatedJson(content)
            try {
              const parsed = JSON.parse(fixed)
              return { plan: parsed as Partial<TravelPlan>, raw: `${content}\n\n[已自动修复截断]` }
            } catch {
              return { plan: null, raw: `${content}\n\n[JSON 被截断且无法自动修复]` }
            }
          }
          return { plan: null, raw: content }
        }
      } catch (e) {
        throw e
      }
    }

    throw new Error('未配置可用的 LLM 提供商（请检查 VITE_BAICHUAN_ENDPOINT/VITE_BAICHUAN_API_KEY/VITE_BAICHUAN_MODEL 或 VITE_OPENAI_API_KEY）。')
  },
}
