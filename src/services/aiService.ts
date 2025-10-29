import type { TravelPlan, CreatePlanInput } from '@/types/plan'

const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'baichuan').toLowerCase()

const BAICHUAN_ENDPOINT = import.meta.env.VITE_BAICHUAN_ENDPOINT || ''
const BAICHUAN_API_KEY = import.meta.env.VITE_BAICHUAN_API_KEY || ''
const BAICHUAN_MODEL = import.meta.env.VITE_BAICHUAN_MODEL || ''

const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

function buildPrompt(input: CreatePlanInput) {
  const days = Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return `你是专业的旅行规划师。请根据用户信息输出仅包含可解析 JSON 的旅行计划（不要其他多余文字）。
要求：
1. 每天安排 3-5 个行程项（景点/餐厅/住宿/交通）
2. 描述简洁（20字以内）
3. 必须包含地理坐标（location_lat/location_lng）
4. 仅输出 JSON，不要任何解释

输出格式示例:
{
  "title": "东京5日游",
  "destination": "东京",
  "start_date": "2025-06-01",
  "end_date": "2025-06-05",
  "budget": 10000,
  "travelers": 2,
  "preferences": {},
  "itinerary_items": [
    {
      "day": 1,
      "type": "attraction",
      "title": "浅草寺",
      "description": "参观浅草寺",
      "location_lat": 35.7148,
      "location_lng": 139.7967,
      "address": "浅草",
      "time_start": "09:00",
      "time_end": "12:00",
      "estimated_cost": 0,
      "order_index": 0
    }
  ]
}

用户需求：
目的地: ${input.destination}
起始日期: ${input.startDate}
结束日期: ${input.endDate}
天数: ${days}天
预算: ${input.budget}元
人数: ${input.travelers}人
偏好: ${input.preferences || '无特殊偏好'}

请立即输出 JSON（不要前后说明）。`
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
      temperature: 0.2,
      max_tokens: 4000, // 增加到 4000
    })
  }

  candidates.push(
    { prompt, max_tokens: 4000, temperature: 0.2 }, // 增加到 4000
    { input: prompt, max_tokens: 4000, temperature: 0.2 },
    { messages: [{ role: 'user', content: prompt }], max_tokens: 4000, temperature: 0.2 },
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

/** 通用返回结构：{ plan: Partial<TravelPlan> | null, raw: string } */
export const aiService = {
  async generateItinerary(input: CreatePlanInput): Promise<{ plan: Partial<TravelPlan> | null; raw: string }> {
    const prompt = buildPrompt(input)

    if (LLM_PROVIDER === 'baichuan') {
      const resp = await tryBaichuanCall(prompt)
      if (resp.ok) {
        const { text } = resp
        const { content } = extractContentFromBaichuanText(text)
        try {
          const parsedPlan = JSON.parse(content)
          return { plan: parsedPlan as Partial<TravelPlan>, raw: content }
        } catch {
          return { plan: null, raw: content }
        }
      } else {
        if (resp.reason === 'missing_config') {
          const msg = 'Baichuan 配置缺失（VITE_BAICHUAN_ENDPOINT/VITE_BAICHUAN_API_KEY）。'
          if (!OPENAI_KEY) throw new Error(msg + ' 且未配置 OpenAI 回退。')
          console.warn(msg + ' 尝试 OpenAI 回退。')
        } else if (resp.reason === 'missing_model') {
          const msg = 'Baichuan 端点需要 model 参数（VITE_BAICHUAN_MODEL 未配置）。请在 .env.local 中设置 VITE_BAICHUAN_MODEL，例如：baichuan-2或平台指定的模型名。'
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
            { role: 'system', content: '你是专业的旅行规划师，输出仅为 JSON，不要额外说明。描述简洁，每项不超过20字。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4000, // 增加到 4000
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
        } catch {
          return { plan: null, raw: content }
        }
      } catch (e) {
        throw e
      }
    }

    throw new Error('未配置可用的 LLM 提供商（请检查 VITE_BAICHUAN_ENDPOINT/VITE_BAICHUAN_API_KEY/VITE_BAICHUAN_MODEL 或 VITE_OPENAI_API_KEY）。')
  },
}
