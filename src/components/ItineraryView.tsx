import React, { useMemo } from 'react'
import { Card, Collapse, List, Button, Space, Typography, Divider, message } from 'antd'
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons'
import type { TravelPlan, ItineraryItem } from '@/types/plan'

const { Panel } = Collapse
const { Title, Text, Paragraph } = Typography

interface ItineraryViewProps {
  plan: Partial<TravelPlan> | null
}

// 将 plan 转成可读文本（用于复制或导出）
function planToPlainText(plan: Partial<TravelPlan>) {
  const lines: string[] = []
  lines.push(`标题: ${plan.title || ''}`)
  lines.push(`目的地: ${plan.destination || ''}`)
  lines.push(`日期: ${plan.start_date || ''} → ${plan.end_date || ''}`)
  lines.push(`人数: ${plan.travelers ?? ''}  预算: ${plan.budget ?? ''}`)
  if (plan.preferences) {
    lines.push(`偏好: ${JSON.stringify(plan.preferences)}`)
  }
  lines.push('\n行程:')
  const items = (plan.itinerary_items || []) as ItineraryItem[]
  const byDay = items.reduce<Record<number, ItineraryItem[]>>((acc, it) => {
    const d = Number(it.day) || 1
    acc[d] = acc[d] || []
    acc[d].push(it)
    return acc
  }, {})
  Object.keys(byDay).sort((a, b) => Number(a) - Number(b)).forEach((day) => {
    lines.push(`\nDay ${day}:`)
    byDay[Number(day)].forEach((it) => {
      lines.push(` - ${it.time_start || ''} ${it.title} @ ${it.address || ''} (${it.type})`)
      if (it.description) lines.push(`   描述: ${it.description}`)
      if (it.estimated_cost) lines.push(`   预计费用: ¥${it.estimated_cost}`)
    })
  })
  return lines.join('\n')
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ plan }) => {
  if (!plan) return null

  const items = (plan.itinerary_items || []) as ItineraryItem[]

  const byDay = useMemo(() => {
    const map: Record<number, ItineraryItem[]> = {}
    items.forEach((it) => {
      const d = Number(it.day) || 1
      map[d] = map[d] || []
      map[d].push(it)
    })
    Object.keys(map).forEach((k) => {
      map[Number(k)].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    })
    return map
  }, [items])

  const handleCopyText = () => {
    const txt = planToPlainText(plan)
    navigator.clipboard?.writeText(txt).then(() => {
      message.success('已复制可读文本')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(plan.title || 'itinerary').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>{plan.title || `${plan.destination} 旅行计划`}</Title>
          <Text type="secondary">
            {plan.destination} · {plan.start_date} → {plan.end_date} · 人数: {plan.travelers ?? 1} · 预算: {plan.budget ?? '未设置'}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Space>
              <Button icon={<CopyOutlined />} onClick={handleCopyText}>复制可读文本</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportJson}>导出 JSON</Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Collapse defaultActiveKey={Object.keys(byDay)[0] ? [String(Object.keys(byDay)[0])] : []}>
        {Object.keys(byDay).sort((a, b) => Number(a) - Number(b)).map((dayKey) => {
          const day = Number(dayKey)
          const dayItems = byDay[day] || []
          return (
            <Panel header={`Day ${day} · ${dayItems.length} 项`} key={dayKey}>
              <List
                dataSource={dayItems}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>{it.time_start ? `${it.time_start} — ${it.time_end || ''}` : ''} <strong>{it.title}</strong></div>
                        <div style={{ color: '#666' }}>{it.estimated_cost ? `¥${it.estimated_cost}` : ''}</div>
                      </div>}
                      description={<div>
                        <div style={{ color: '#666' }}>{it.type} · {it.address || ''}</div>
                        {it.description && <Paragraph style={{ marginTop: 8 }}>{it.description}</Paragraph>}
                      </div>}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: '无行程项' }}
              />
            </Panel>
          )
        })}
      </Collapse>
      <Divider />
    </div>
  )
}

export default ItineraryView
