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

      const { data: insertedItems, error: itemsErr } = await supabase
        .from('itinerary_items')
        .insert(items)
        .select()

      if (itemsErr) {
        console.warn('部分行程项保存失败', itemsErr)
      }

      // 新增：自动创建费用记录
      if (insertedItems && insertedItems.length > 0) {
        const expenses = insertedItems
          .filter(item => (item.estimated_cost ?? 0) > 0) // 只为有费用的行程创建记录
          .map((item, index) => {
            // 根据行程类型映射费用类别
            const categoryMap: Record<string, string> = {
              transport: 'transport',
              accommodation: 'accommodation',
              attraction: 'attraction',
              restaurant: 'food',
            }
            
            // 计算费用日期：开始日期 + 行程天数
            const startDate = new Date(planData.start_date!)
            const expenseDate = new Date(startDate)
            expenseDate.setDate(startDate.getDate() + (item.day - 1))

            return {
              plan_id: planId,
              itinerary_item_id: item.id,
              category: categoryMap[item.type] || 'other',
              amount: item.estimated_cost,
              currency: 'CNY',
              description: `${item.title} - 预估费用`,
              expense_date: expenseDate.toISOString().split('T')[0],
            }
          })

        if (expenses.length > 0) {
          const { error: expensesErr } = await supabase
            .from('expenses')
            .insert(expenses)

          if (expensesErr) {
            console.warn('自动创建费用记录失败', expensesErr)
          } else {
            console.log(`✅ 已自动创建 ${expenses.length} 条费用记录`)
          }
        }
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
      .order('day', { ascending: true })
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

  // 更新计划基本信息
  async updatePlan(planId: string, updates: Partial<TravelPlan>) {
    const { data, error } = await supabase
      .from('travel_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 新增：添加行程项时同时创建费用记录
  async addItineraryItem(item: Omit<ItineraryItem, 'id'>) {
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert([{
        plan_id: item.plan_id,
        day: item.day,
        type: item.type,
        title: item.title,
        description: item.description || null,
        location_lat: (item as any).location_lat || null,
        location_lng: (item as any).location_lng || null,
        address: item.address || null,
        time_start: item.time_start || null,
        time_end: item.time_end || null,
        estimated_cost: item.estimated_cost || null,
        booking_info: item.booking_info || null,
        order_index: item.order_index || 0,
      }])
      .select()
      .single()

    if (error) throw error

    // 如果有预估费用，自动创建费用记录
    if (data && (data.estimated_cost ?? 0) > 0) {
      // 获取计划信息以确定日期
      const { data: plan } = await supabase
        .from('travel_plans')
        .select('start_date')
        .eq('id', item.plan_id)
        .single()

      if (plan) {
        const categoryMap: Record<string, string> = {
          transport: 'transport',
          accommodation: 'accommodation',
          attraction: 'attraction',
          restaurant: 'food',
        }

        const startDate = new Date(plan.start_date)
        const expenseDate = new Date(startDate)
        expenseDate.setDate(startDate.getDate() + (data.day - 1))

        await supabase.from('expenses').insert([{
          plan_id: item.plan_id,
          itinerary_item_id: data.id,
          category: categoryMap[data.type] || 'other',
          amount: data.estimated_cost,
          currency: 'CNY',
          description: `${data.title} - 预估费用`,
          expense_date: expenseDate.toISOString().split('T')[0],
        }])
      }
    }

    return data
  },

  // 修改：更新行程项时同步更新费用记录
  async updateItineraryItem(itemId: string, updates: Partial<ItineraryItem>) {
    const { data, error } = await supabase
      .from('itinerary_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // 如果更新了费用，同步更新对应的费用记录
    if (data && updates.estimated_cost !== undefined) {
      // 查找关联的费用记录
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('itinerary_item_id', itemId)
        .limit(1)

      if (existingExpenses && existingExpenses.length > 0) {
        // 更新现有费用记录
        if (updates.estimated_cost > 0) {
          await supabase
            .from('expenses')
            .update({
              amount: updates.estimated_cost,
              description: updates.title ? `${updates.title} - 预估费用` : undefined,
            })
            .eq('id', existingExpenses[0].id)
        } else {
          // 如果费用变为0，删除费用记录
          await supabase
            .from('expenses')
            .delete()
            .eq('id', existingExpenses[0].id)
        }
      } else if (updates.estimated_cost > 0) {
        // 如果没有费用记录但现在有费用，创建新记录
        const { data: plan } = await supabase
          .from('travel_plans')
          .select('start_date')
          .eq('id', data.plan_id)
          .single()

        if (plan) {
          const categoryMap: Record<string, string> = {
            transport: 'transport',
            accommodation: 'accommodation',
            attraction: 'attraction',
            restaurant: 'food',
          }

          const startDate = new Date(plan.start_date)
          const expenseDate = new Date(startDate)
          expenseDate.setDate(startDate.getDate() + (data.day - 1))

          await supabase.from('expenses').insert([{
            plan_id: data.plan_id,
            itinerary_item_id: data.id,
            category: categoryMap[data.type] || 'other',
            amount: updates.estimated_cost,
            currency: 'CNY',
            description: `${updates.title || data.title} - 预估费用`,
            expense_date: expenseDate.toISOString().split('T')[0],
          }])
        }
      }
    }

    return data
  },

  // 修改：删除行程项时同时删除关联的费用记录
  async deleteItineraryItem(itemId: string) {
    // 先删除关联的费用记录
    await supabase
      .from('expenses')
      .delete()
      .eq('itinerary_item_id', itemId)

    // 再删除行程项
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  },

  // 批量更新行程项顺序
  async reorderItineraryItems(items: { id: string; order_index: number }[]) {
    const promises = items.map(item =>
      supabase
        .from('itinerary_items')
        .update({ order_index: item.order_index })
        .eq('id', item.id)
    )

    await Promise.all(promises)
  },
}
