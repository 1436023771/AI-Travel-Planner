import { useState, useRef } from 'react'
import { Card, Form, Input, DatePicker, InputNumber, Button, Space, message, Divider, Table, Typography, Tag, Alert } from 'antd'
import { SoundOutlined, StopOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { aiService } from '@/services/aiService'
import { createVoiceRecorder } from '@/services/voiceService'
import { planService } from '@/services/planService'
import { MapPreview } from '@/components/MapPreview'
import { useAuthStore } from '@/store/authStore'
import type { CreatePlanInput } from '@/types/plan'
import { sortItineraryItems } from '@/utils/itineraryUtils'

const { RangePicker } = DatePicker
const recorder = createVoiceRecorder()

export const CreatePlan = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const { user } = useAuthStore()
  const formRef = useRef<any>(null)

  const startRecording = async () => {
    if (!recorder.supported) {
      message.warning('当前浏览器不支持 Web Speech API，请使用文字输入。')
      return
    }
    try {
      setIsRecording(true)
      recorder.onResult((text) => {
        setTranscript((prev) => (prev ? prev + '\n' + text : text))
      })
      recorder.onError((err) => {
        message.error(String(err))
        setIsRecording(false)
      })
      await recorder.start()
    } catch (e) {
      message.error('无法开始录音：' + String(e))
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    try {
      recorder.stop()
    } finally {
      setIsRecording(false)
    }
  }

  const handleGenerate = async (values?: any) => {
    const formValues = values || (formRef.current && formRef.current.getFieldsValue())
    if (!formValues.destination || !formValues.dateRange) {
      message.error('请填写目的地和日期区间')
      return
    }
    const [start, end] = formValues.dateRange
    const input: CreatePlanInput = {
      destination: formValues.destination,
      startDate: dayjs(start).format('YYYY-MM-DD'),
      endDate: dayjs(end).format('YYYY-MM-DD'),
      budget: formValues.budget || 0,
      travelers: formValues.travelers || 1,
      preferences: (formValues.preferences || '') + (transcript ? `；语音备注：${transcript}` : ''),
    }

    setGenerating(true)
    setAiResult(null)
    try {
      const { plan, raw } = await aiService.generateItinerary(input)
      setRawText(raw)
      if (plan) {
        setAiResult(plan)
        message.success('AI 行程生成完成')
      } else {
        setAiResult({ note: '无法解析为 JSON，查看原文。' })
        message.warning('AI 返回无法解析为 JSON，请查看「原始输出」')
      }
    } catch (e: any) {
      message.error('生成失败：' + (e.message || String(e)))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!user) {
      message.error('请先登录后保存计划')
      return
    }
    if (!aiResult) {
      message.error('请先生成行程')
      return
    }
    
    setLoading(true)
    try {
      // 保存前对行程重新排序并分配 order_index
      const sortedItems = sortItineraryItems(aiResult.itinerary_items || [])
      const itemsWithIndex = sortedItems.map((item, index) => ({
        ...item,
        order_index: index,
      }))
      
      await planService.savePlan(user.id, {
        ...aiResult,
        itinerary_items: itemsWithIndex,
      })
      
      const expenseCount = itemsWithIndex.filter(item => (item.estimated_cost ?? 0) > 0).length
      message.success({
        content: (
          <span>
            旅行计划已保存！已自动创建 {expenseCount} 条费用记录
          </span>
        ),
        duration: 3,
      })
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    } catch (e: any) {
      message.error('保存失败：' + (e.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  const calculateBudgetBreakdown = () => {
    if (!aiResult?.itinerary_items) return null

    const breakdown = {
      transport: 0,
      accommodation: 0,
      attraction: 0,
      restaurant: 0,
      total: 0,
    }

    aiResult.itinerary_items.forEach((item: any) => {
      const cost = item.estimated_cost || 0
      const type = item.type || 'other'
      if (type in breakdown) {
        breakdown[type as keyof typeof breakdown] += cost
      }
      breakdown.total += cost
    })

    return breakdown
  }

  const budgetBreakdown = aiResult ? calculateBudgetBreakdown() : null
  const formBudget = formRef.current?.getFieldValue('budget') || 0
  const isBudgetExceeded = budgetBreakdown && formBudget > 0 && budgetBreakdown.total > formBudget
  const budgetUsagePercent = budgetBreakdown && formBudget > 0 
    ? Math.round((budgetBreakdown.total / formBudget) * 100) 
    : 0

  const columns = [
    {
      title: '天数',
      dataIndex: 'day',
      width: 60,
      render: (day: number) => `第${day}天`,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          transport: '🚗 交通',
          accommodation: '🏨 住宿',
          attraction: '🎯 景点',
          restaurant: '🍴 餐饮',
        }
        return typeMap[type] || type
      },
    },
    {
      title: '项目',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '时间',
      key: 'time',
      width: 150,
      render: (_: any, record: any) => (
        <span>{record.time_start} - {record.time_end}</span>
      ),
    },
    {
      title: '预算',
      dataIndex: 'estimated_cost',
      width: 100,
      render: (cost: number) => (cost ? `¥${cost}` : '-'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <h1>创建旅行计划</h1>

      <Card style={{ marginTop: 16 }}>
        <Form
          layout="vertical"
          ref={formRef}
          initialValues={{ travelers: 1 }}
          onFinish={handleGenerate}
        >
          <Form.Item name="destination" label="目的地" rules={[{ required: true }]}>
            <Input placeholder="例如：日本 东京" />
          </Form.Item>

          <Form.Item name="dateRange" label="出行日期" rules={[{ required: true }]}>
            <RangePicker />
          </Form.Item>

          <Form.Item name="budget" label="预算（元）">
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="travelers" label="出行人数">
            <InputNumber min={1} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="preferences" label="偏好（文字描述，可选）">
            <Input.TextArea rows={3} placeholder="例如：喜欢美食、亲子游、爱逛博物馆" />
          </Form.Item>

          <Form.Item label="语音输入（可选）">
            <Space>
              <Button
                icon={<SoundOutlined />}
                onClick={startRecording}
                disabled={isRecording}
              >
                开始录音
              </Button>
              <Button
                icon={<StopOutlined />}
                onClick={stopRecording}
                disabled={!isRecording}
              >
                停止
              </Button>
              <Button
                onClick={() => {
                  setTranscript('')
                  message.success('已清空语音内容')
                }}
              >
                清空语音文本
              </Button>
            </Space>

            <Input.TextArea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              style={{ marginTop: 12 }}
              placeholder="录音识别结果或手动输入的语音备注将追加到偏好中"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={generating}>
                生成 AI 行程
              </Button>
              <Button
                onClick={() => {
                  formRef.current?.resetFields()
                  setTranscript('')
                  setAiResult(null)
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <div>
        <h2>AI 生成结果</h2>
        {!aiResult && <p style={{ color: '#666' }}>请填写信息并点击"生成 AI 行程"</p>}
        {aiResult && (
          <>
            {budgetBreakdown && (
              <Card style={{ marginBottom: 16 }}>
                <h3>💰 预算分析</h3>
                
                {/* 预算对比 */}
                {formBudget > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>预算使用：</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: isBudgetExceeded ? '#ff4d4f' : budgetUsagePercent > 90 ? '#faad14' : '#52c41a' 
                      }}>
                        {budgetUsagePercent}%
                      </span>
                    </div>
                    <div style={{ 
                      background: '#f0f0f0', 
                      borderRadius: 4, 
                      overflow: 'hidden',
                      height: 20,
                    }}>
                      <div style={{ 
                        width: `${Math.min(budgetUsagePercent, 100)}%`,
                        height: '100%',
                        background: isBudgetExceeded ? '#ff4d4f' : budgetUsagePercent > 90 ? '#faad14' : '#52c41a',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 12, 
                      color: isBudgetExceeded ? '#ff4d4f' : '#666' 
                    }}>
                      {isBudgetExceeded && '⚠️ 超出预算！'}
                      预算：¥{formBudget} / 实际：¥{budgetBreakdown.total} / 
                      {isBudgetExceeded 
                        ? `超支：¥${budgetBreakdown.total - formBudget}` 
                        : `剩余：¥${formBudget - budgetBreakdown.total}`
                      }
                    </div>
                  </div>
                )}
                
                {/* 分类预算 */}
                <Space size="large" wrap>
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>总计</div>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: isBudgetExceeded ? '#ff4d4f' : '#1890ff' 
                    }}>
                      ¥{budgetBreakdown.total}
                    </div>
                  </div>
                  <Divider type="vertical" style={{ height: 50 }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>交通</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      ¥{budgetBreakdown.transport}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {formBudget > 0 && `${Math.round(budgetBreakdown.transport/formBudget*100)}%`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>住宿</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      ¥{budgetBreakdown.accommodation}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {formBudget > 0 && `${Math.round(budgetBreakdown.accommodation/formBudget*100)}%`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>景点</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      ¥{budgetBreakdown.attraction}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {formBudget > 0 && `${Math.round(budgetBreakdown.attraction/formBudget*100)}%`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>餐饮</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      ¥{budgetBreakdown.restaurant}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {formBudget > 0 && `${Math.round(budgetBreakdown.restaurant/formBudget*100)}%`}
                    </div>
                  </div>
                </Space>
                
                {/* 预算建议 */}
                {isBudgetExceeded && (
                  <Alert
                    message="预算超支提醒"
                    description="当前行程费用超出预算，建议：1) 选择更经济的住宿 2) 减少付费景点 3) 选择平价餐厅 4) 多使用公共交通"
                    type="warning"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            )}

            {Array.isArray(aiResult.itinerary_items) && aiResult.itinerary_items.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <h3>🗺️ 地图预览</h3>
                {(() => {
                  const sortedAiItems = sortItineraryItems(aiResult.itinerary_items)
                  
                  // 检测坐标质量（排除坐标为 0 的点）
                  const validCoords = sortedAiItems.filter((item: any) => {
                    const lat = item.location_lat
                    const lng = item.location_lng
                    return typeof lat === 'number' && typeof lng === 'number' 
                           && lat !== 0 && lng !== 0 // 排除坐标为 0
                           && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
                  })
                  
                  const invalidCoords = sortedAiItems.filter((item: any) => {
                    const lat = item.location_lat
                    const lng = item.location_lng
                    return !(typeof lat === 'number' && typeof lng === 'number' 
                           && lat !== 0 && lng !== 0 
                           && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
                  })
                  
                  // 检测重复坐标
                  const coordMap = new Map<string, number>()
                  validCoords.forEach((item: any) => {
                    const key = `${item.location_lat.toFixed(4)},${item.location_lng.toFixed(4)}`
                    coordMap.set(key, (coordMap.get(key) || 0) + 1)
                  })
                  const duplicateCount = Array.from(coordMap.values()).filter(count => count > 1).length
                  
                  return (
                    <>
                      <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                        总共 {sortedAiItems.length} 个行程点，
                        有效坐标 {validCoords.length} 个
                        {invalidCoords.length > 0 && (
                          <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                            ({invalidCoords.length} 个无效/缺失坐标将不显示在地图上)
                          </span>
                        )}
                        {duplicateCount > 0 && (
                          <span style={{ color: '#fa8c16', marginLeft: 8 }}>
                            ⚠️ {duplicateCount} 组重复坐标
                          </span>
                        )}
                      </div>
                      
                      {invalidCoords.length > 0 && (
                        <Alert
                          message="部分地点缺少准确坐标"
                          description={
                            <div>
                              以下地点将不显示在地图上：
                              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                                {invalidCoords.slice(0, 5).map((item: any, idx: number) => (
                                  <li key={idx}>{item.title}</li>
                                ))}
                                {invalidCoords.length > 5 && <li>...还有 {invalidCoords.length - 5} 个</li>}
                              </ul>
                              建议重新生成以获得完整坐标。
                            </div>
                          }
                          type="warning"
                          showIcon
                          closable
                          style={{ marginBottom: 12 }}
                          action={
                            <Button size="small" onClick={() => handleGenerate()}>
                              重新生成
                            </Button>
                          }
                        />
                      )}
                      
                      {duplicateCount > 0 && (
                        <Alert
                          message="坐标质量提醒"
                          description="检测到部分地点使用了相同坐标，建议重新生成以获得更精确的位置信息。"
                          type="warning"
                          showIcon
                          closable
                          style={{ marginBottom: 12 }}
                          action={
                            <Button size="small" onClick={() => handleGenerate()}>
                              重新生成
                            </Button>
                          }
                        />
                      )}
                      
                      {/* 显示前3个有效坐标 */}
                      {validCoords.length > 0 && (
                        <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
                          有效坐标示例（前3个）：
                          {validCoords.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx}>
                              {idx + 1}. {item.title}: [{item.location_lng}, {item.location_lat}]
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <MapPreview items={sortedAiItems} height={400} showRoute={true} />
                      <Divider />
                      <h3>📅 行程安排</h3>
                      <Table
                        columns={columns}
                        dataSource={sortedAiItems}
                        rowKey={(record, index) => `${record.day}-${index}`}
                        pagination={false}
                        size="small"
                      />
                    </>
                  )
                })()}
              </Card>
            )}

            <Card style={{ marginBottom: 16 }}>
              <Typography.Paragraph>
                <Typography.Text
                  copyable={{
                    text: JSON.stringify(aiResult, null, 2),
                  }}
                >
                  点击复制完整 JSON
                </Typography.Text>
              </Typography.Paragraph>
              {rawText && (
                <>
                  <Divider />
                  <Typography.Title level={5}>原始输出（LLM）</Typography.Title>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                    {rawText}
                  </pre>
                </>
              )}
            </Card>

            <div style={{ marginTop: 12 }}>
              <Space>
                <Button type="primary" onClick={handleSave} loading={loading} size="large">
                  保存到云端
                </Button>
                <Button onClick={() => navigate('/dashboard')} size="large">
                  返回列表
                </Button>
              </Space>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
