import type { TravelPlan, CreatePlanInput } from '@/types/plan'

const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'baichuan').toLowerCase()

const BAICHUAN_ENDPOINT = import.meta.env.VITE_BAICHUAN_ENDPOINT || ''
const BAICHUAN_API_KEY = import.meta.env.VITE_BAICHUAN_API_KEY || ''
const BAICHUAN_MODEL = import.meta.env.VITE_BAICHUAN_MODEL || ''

const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

function buildPrompt(input: CreatePlanInput) {
  const days = Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const totalBudget = input.budget || 5000
  const budgetPerPerson = totalBudget / input.travelers
  const budgetPerDay = budgetPerPerson / days
  
  // 计算建议的预算分配（基于常见比例）
  const budgetAllocation = {
    accommodation: Math.round(totalBudget * 0.35), // 住宿 35%
    food: Math.round(totalBudget * 0.30),          // 餐饮 30%
    attraction: Math.round(totalBudget * 0.20),    // 景点 20%
    transport: Math.round(totalBudget * 0.15),     // 交通 15%
  }
  
  return `你是专业的旅行规划师。请严格按照用户预算生成旅行计划。

【重要约束】
1. 总预算：${totalBudget}元（${input.travelers}人共${days}天）
2. 人均预算：${Math.round(budgetPerPerson)}元
3. 日均预算：${Math.round(budgetPerDay)}元/人
4. 预算分配建议：
   - 住宿：${budgetAllocation.accommodation}元（${Math.round(budgetAllocation.accommodation/days)}元/晚）
   - 餐饮：${budgetAllocation.food}元（${Math.round(budgetAllocation.food/days)}元/天）
   - 景点：${budgetAllocation.attraction}元
   - 交通：${budgetAllocation.transport}元
5. 所有 estimated_cost 之和不得超过总预算的 95%

【输出要求】
1. 仅输出 JSON，不要任何前后文字
2. 每天 2-4 个行程项
3. 描述精简（15字内）
4. 必须包含真实的经纬度坐标
5. estimated_cost 必须合理且符合预算
6. type 只能是：transport、accommodation、attraction、restaurant

【费用估算标准】
- 住宿：根据目的地档次，经济型80-200元/人/晚，中档200-400元/人/晚
- 餐饮：早餐15-30元，午餐30-60元，晚餐40-80元（人均）
- 景点：免费景点0元，一般景点30-100元，知名景点100-200元
- 交通：公共交通2-10元，打车20-50元，长途根据距离

JSON 格式示例：
{
  "title": "${input.destination}${days}日游",
  "destination": "${input.destination}",
  "start_date": "${input.startDate}",
  "end_date": "${input.endDate}",
  "budget": ${totalBudget},
  "travelers": ${input.travelers},
  "preferences": {},
  "itinerary_items": [
    {
      "day": 1,
      "type": "accommodation",
      "title": "如家酒店",
      "description": "经济型酒店",
      "location_lat": 39.9042,
      "location_lng": 116.4074,
      "address": "市中心",
      "time_start": "15:00",
      "time_end": "12:00",
      "estimated_cost": ${Math.round(budgetAllocation.accommodation/days * input.travelers)},
      "order_index": 0
    },
    {
      "day": 1,
      "type": "attraction",
      "title": "天安门广场",
      "description": "免费景点",
      "location_lat": 39.9042,
      "location_lng": 116.4074,
      "address": "东城区",
      "time_start": "09:00",
      "time_end": "11:00",
      "estimated_cost": 0,
      "order_index": 1
    }
  ]
}

【用户需求】
目的地: ${input.destination}
日期: ${input.startDate} 至 ${input.endDate}（${days}天）
总预算: ${totalBudget}元（${input.travelers}人）
人均: ${Math.round(budgetPerPerson)}元
偏好: ${input.preferences || '性价比优先，控制预算'}

【特别提醒】
- 优先推荐免费或低价景点
- 选择经济实惠的餐厅
- 住宿选择性价比高的选项
- 多使用公共交通
- 确保总费用不超预算

立即输出符合预算的完整 JSON：`
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
