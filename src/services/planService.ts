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
  }
}
