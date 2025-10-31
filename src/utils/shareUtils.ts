import type { TravelPlan, ItineraryItem } from '@/types/plan'

export const shareUtils = {
  // 生成文本格式的行程
  generateTextItinerary(plan: TravelPlan, items: ItineraryItem[]): string {
    let text = `【${plan.title}】\n\n`
    text += `📍 目的地：${plan.destination}\n`
    text += `📅 日期：${plan.start_date} ~ ${plan.end_date}\n`
    text += `👥 人数：${plan.travelers}人\n`
    text += `💰 预算：¥${plan.budget}\n\n`

    const itemsByDay = items.reduce((acc, item) => {
      if (!acc[item.day]) acc[item.day] = []
      acc[item.day].push(item)
      return acc
    }, {} as Record<number, ItineraryItem[]>)

    Object.keys(itemsByDay).sort((a, b) => Number(a) - Number(b)).forEach(day => {
      text += `=== 第${day}天 ===\n`
      itemsByDay[Number(day)].forEach(item => {
        const typeIcon = { transport: '🚗', accommodation: '🏨', attraction: '🎯', restaurant: '🍴' }[item.type] || '📍'
        text += `${typeIcon} ${item.time_start || ''} ${item.title}\n`
        if (item.description) text += `   ${item.description}\n`
        if (item.address) text += `   📍 ${item.address}\n`
        if (item.estimated_cost) text += `   💰 ¥${item.estimated_cost}\n`
      })
      text += '\n'
    })

    return text
  },

  // 复制到剪贴板
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  },

  // 生成分享链接
  generateShareLink(planId: string): string {
    return `${window.location.origin}/plan/${planId}`
  },

  // 下载为文本文件
  downloadAsText(plan: TravelPlan, items: ItineraryItem[]) {
    const text = this.generateTextItinerary(plan, items)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${plan.title || plan.destination}.txt`
    link.click()
    URL.revokeObjectURL(url)
  },
}
