import { supabase } from '@/lib/supabase'

export interface Expense {
  id?: string
  plan_id: string
  itinerary_item_id?: string
  category: 'transport' | 'accommodation' | 'food' | 'attraction' | 'shopping' | 'other'
  amount: number
  currency: string
  description: string
  expense_date: string
  created_at?: string
}

export const expenseService = {
  // 添加费用记录
  async addExpense(expense: Expense) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 获取计划的所有费用
  async getPlanExpenses(planId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('plan_id', planId)
      .order('expense_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 删除费用记录
  async deleteExpense(expenseId: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error
  },

  // 更新费用记录
  async updateExpense(expenseId: string, updates: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 获取费用统计
  async getExpenseStats(planId: string) {
    const expenses = await this.getPlanExpenses(planId)
    
    const stats = {
      total: 0,
      byCategory: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
    }

    expenses.forEach(exp => {
      stats.total += exp.amount
      stats.byCategory[exp.category] = (stats.byCategory[exp.category] || 0) + exp.amount
      stats.byDate[exp.expense_date] = (stats.byDate[exp.expense_date] || 0) + exp.amount
    })

    return stats
  },
}
