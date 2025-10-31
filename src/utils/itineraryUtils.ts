import type { ItineraryItem } from '@/types/plan'

/**
 * 统一的行程项排序函数
 * 排序规则：day (升序) -> order_index (升序) -> time_start (升序)
 */
export function sortItineraryItems(items: ItineraryItem[]): ItineraryItem[] {
  return items.slice().sort((a, b) => {
    // 首先按天数排序
    if (a.day !== b.day) return (a.day ?? 0) - (b.day ?? 0)
    
    // 同一天内按 order_index 排序
    if ((a.order_index ?? 0) !== (b.order_index ?? 0)) {
      return (a.order_index ?? 0) - (b.order_index ?? 0)
    }
    
    // 如果 order_index 相同，按时间排序
    const timeA = a.time_start || ''
    const timeB = b.time_start || ''
    return timeA.localeCompare(timeB)
  })
}

/**
 * 根据时间重新计算 order_index
 * 同一天内的行程按 time_start 排序并分配新的 order_index
 */
export function recalculateOrderIndexes(items: ItineraryItem[]): Array<{ id: string; order_index: number }> {
  const updates: Array<{ id: string; order_index: number }> = []
  
  // 先按天分组
  const byDay: Record<number, ItineraryItem[]> = {}
  items.forEach(item => {
    const day = item.day ?? 1
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(item)
  })
  
  // 对每一天的行程按时间排序并分配 order_index
  Object.keys(byDay).forEach(dayStr => {
    const day = Number(dayStr)
    const dayItems = byDay[day].sort((a, b) => {
      const timeA = a.time_start || '00:00'
      const timeB = b.time_start || '00:00'
      return timeA.localeCompare(timeB)
    })
    
    dayItems.forEach((item, index) => {
      if (item.id) {
        updates.push({ id: item.id, order_index: index })
      }
    })
  })
  
  return updates
}

/**
 * 计算新行程项的 order_index
 * 在同一天的现有行程中找到合适的插入位置
 */
export function calculateNewOrderIndex(
  existingItems: ItineraryItem[],
  newDay: number,
  newTimeStart: string
): number {
  const sameDayItems = existingItems
    .filter(item => item.day === newDay)
    .sort((a, b) => {
      const timeA = a.time_start || '00:00'
      const timeB = b.time_start || '00:00'
      return timeA.localeCompare(timeB)
    })
  
  if (sameDayItems.length === 0) return 0
  
  // 找到应该插入的位置
  for (let i = 0; i < sameDayItems.length; i++) {
    const itemTime = sameDayItems[i].time_start || '00:00'
    if (newTimeStart < itemTime) {
      return i
    }
  }
  
  // 如果比所有现有时间都晚，放在最后
  return sameDayItems.length
}
