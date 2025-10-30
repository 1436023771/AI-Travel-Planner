import { supabase } from '@/lib/supabase'
import type { TravelPlan, ItineraryItem } from '@/types/plan'

export const planService = {
  async savePlan(userId: string, planData: Partial<TravelPlan> & { itinerary_items?: ItineraryItem[] }) {
    // insert travel_plans
    const { title, destination, start_date, end_date, budget, travelers, preferences, status } = planData
    const { data: planRow, error: planErr } = await supabase
      .from('travel_plans')
      .insert([{
        user_id: userId,
        title: title || `${destination} 旅行计划`,
        destination,
        start_date,
        end_date,
        budget: budget ?? null,
        travelers: travelers ?? 1,
        preferences: preferences ?? {},
        status: status ?? 'draft',
      }])
      .select()
      .single()

    if (planErr || !planRow) {
      throw planErr || new Error('保存旅行计划失败')
    }

    const planId = planRow.id

    if (planData.itinerary_items && planData.itinerary_items.length) {
      const items = planData.itinerary_items.map((it) => ({
        plan_id: planId,
        day: it.day,
        type: it.type,
        title: it.title,
        description: it.description,
        location_lat: (it as any).location_lat ?? (it as any).location?.lat ?? null,
        location_lng: (it as any).location_lng ?? (it as any).location?.lng ?? null,
        address: it.address ?? null,
        time_start: it.time_start ?? null,
        time_end: it.time_end ?? null,
        estimated_cost: it.estimated_cost ?? null,
        booking_info: it.booking_info ?? null,
        order_index: it.order_index ?? 0,
      }))

      const { error: itemsErr } = await supabase.from('itinerary_items').insert(items)
      if (itemsErr) {
        // not fatal for now, but notify
        console.warn('部分行程项保存失败', itemsErr)
      }
    }

    return planRow
  },

  // 新增：根据 planId 拉取计划与行程项
  async getPlanById(planId: string) {
    // 先获取主表
    const { data: planRow, error: planErr } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planErr || !planRow) {
      throw planErr || new Error('未找到指定的旅行计划')
    }

    // 再获取对应的 itinerary_items
    const { data: items, error: itemsErr } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true })

    if (itemsErr) {
      console.warn('获取行程项失败', itemsErr)
    }

    return { ...planRow, itinerary_items: items || [] as ItineraryItem[] }
  },

  // 获取用户的所有计划
  async getUserPlans(userId: string) {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 删除计划
  async deletePlan(planId: string) {
    const { error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', planId)

    if (error) throw error
  },

  // 更新计划状态
  async updatePlanStatus(planId: string, status: 'draft' | 'active' | 'completed') {
    const { error } = await supabase
      .from('travel_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', planId)

    if (error) throw error
  },
}
