import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Spin, Divider, Tabs, Timeline, Tag, Button, Space } from 'antd'
import { CalendarOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { planService } from '@/services/planService'
import { MapPreview } from '@/components/MapPreview'
import type { TravelPlan, ItineraryItem } from '@/types/plan'

export const PlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
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

  // 按天分组
  const itemsByDay = items.reduce((acc, item) => {
    const day = item.day || 1
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {} as Record<number, ItineraryItem[]>)

  const days = Object.keys(itemsByDay).map(Number).sort((a, b) => a - b)

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      transport: '🚗',
      accommodation: '🏨',
      attraction: '🎯',
      restaurant: '🍴',
    }
    return icons[type] || '📍'
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1>{plan.title || '旅行计划详情'}</h1>
        <Space size="large" style={{ color: '#666', marginTop: 8 }}>
          <span>
            <EnvironmentOutlined /> {plan.destination}
          </span>
          <span>
            <CalendarOutlined /> {plan.start_date} → {plan.end_date}
          </span>
          <span>👥 {plan.travelers} 人</span>
          {plan.budget && <span>💰 预算 ¥{plan.budget}</span>}
        </Space>
      </div>

      <Divider />

      <Card style={{ marginBottom: 16 }}>
        <h3>🗺️ 行程地图</h3>
        <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
          共 {items.length} 个行程点 · 
          {items.filter(item => 
            typeof (item as any).location_lat === 'number' && 
            typeof (item as any).location_lng === 'number'
          ).length} 个有效坐标
        </div>
        <MapPreview 
          items={items} 
          height={500} 
          showRoute={true}
        />
      </Card>

      <Card>
        <Tabs
          defaultActiveKey="timeline"
          items={[
            {
              key: 'timeline',
              label: '📅 时间轴视图',
              children: (
                <div>
                  {days.map((day) => (
                    <div key={day} style={{ marginBottom: 32 }}>
                      <h3 style={{ marginBottom: 16 }}>第 {day} 天</h3>
                      <Timeline
                        items={itemsByDay[day].map((item) => ({
                          children: (
                            <div>
                              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                                {getTypeIcon(item.type)} {item.title}
                                {item.estimated_cost > 0 && (
                                  <Tag color="blue" style={{ marginLeft: 8 }}>
                                    ¥{item.estimated_cost}
                                  </Tag>
                                )}
                              </div>
                              <div style={{ color: '#666', fontSize: 13 }}>
                                <ClockCircleOutlined /> {item.time_start} - {item.time_end}
                              </div>
                              {item.address && (
                                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                                  <EnvironmentOutlined /> {item.address}
                                </div>
                              )}
                              {item.description && (
                                <div style={{ marginTop: 8, color: '#333' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          ),
                        }))}
                      />
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'list',
              label: '📋 列表视图',
              children: (
                <div>
                  {items.map((item, idx) => (
                    <Card
                      key={idx}
                      size="small"
                      style={{ marginBottom: 12 }}
                      title={
                        <Space>
                          <span>第 {item.day} 天</span>
                          <span>|</span>
                          <span>{getTypeIcon(item.type)} {item.title}</span>
                        </Space>
                      }
                      extra={
                        item.estimated_cost > 0 && (
                          <Tag color="blue">¥{item.estimated_cost}</Tag>
                        )
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <ClockCircleOutlined /> {item.time_start} - {item.time_end}
                        </div>
                        {item.address && (
                          <div>
                            <EnvironmentOutlined /> {item.address}
                          </div>
                        )}
                        {item.description && <div>{item.description}</div>}
                      </Space>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Space>
          <Button onClick={() => navigate('/dashboard')}>返回列表</Button>
          <Button type="primary">编辑行程</Button>
        </Space>
      </div>
    </div>
  )
}
