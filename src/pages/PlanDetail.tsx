import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Spin, List, Divider } from 'antd'
import { planService } from '@/services/planService'
import { MapPreview } from '@/components/MapPreview'
import type { TravelPlan, ItineraryItem } from '@/types/plan'

export const PlanDetail = () => {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    planService.getPlanById(id)
      .then((p) => {
        setPlan(p as TravelPlan)
      })
      .catch((e) => {
        setError(e.message || '加载失败')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin />
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{error}</div>
  }

  if (!plan) {
    return <div style={{ padding: 24 }}>未找到该计划</div>
  }

  const items: ItineraryItem[] = (plan.itinerary_items || []) as ItineraryItem[]

  return (
    <div style={{ padding: 24 }}>
      <h1>{plan.title || '旅行计划详情'}</h1>
      <p style={{ color: '#666' }}>
        目的地：{plan.destination} &nbsp; | &nbsp; {plan.start_date} → {plan.end_date} &nbsp; | &nbsp; 预算：{plan.budget ?? '未设置'}
      </p>

      <Divider />

      <Card style={{ marginBottom: 16 }}>
        <h3>行程地图预览</h3>
        <MapPreview items={items} height={400} />
      </Card>

      <Card>
        <h3>行程明细</h3>
        <List
          dataSource={items}
          renderItem={(it) => (
            <List.Item>
              <List.Item.Meta
                title={`${it.day} 天 - ${it.title}`}
                description={<div>
                  <div>{it.type} · {it.address || ''}</div>
                  <div style={{ color: '#666', marginTop: 6 }}>{it.time_start || ''} — {it.time_end || ''}</div>
                  {it.description && <div style={{ marginTop: 8 }}>{it.description}</div>}
                </div>}
              />
              <div style={{ minWidth: 120, textAlign: 'right' }}>
                <div style={{ color: '#666' }}>{it.estimated_cost ? `¥${it.estimated_cost}` : ''}</div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: '暂无行程项' }}
        />
      </Card>
    </div>
  )
}
