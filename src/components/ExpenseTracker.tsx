import { useState, useEffect } from 'react'
import { Card, Button, Table, Form, InputNumber, Select, Input, DatePicker, Space, Modal, message, Tag, Statistic, Row, Col } from 'antd'
import { PlusOutlined, SoundOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { expenseService, type Expense } from '@/services/expenseService'
import { createVoiceRecorder } from '@/services/voiceService'

const recorder = createVoiceRecorder()

interface ExpenseTrackerProps {
  planId: string
  budget?: number
}

export const ExpenseTracker = ({ planId, budget = 0 }: ExpenseTrackerProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [form] = Form.useForm()

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await expenseService.getPlanExpenses(planId)
      const statsData = await expenseService.getExpenseStats(planId)
      setExpenses(data)
      setStats(statsData)
    } catch (e: any) {
      message.error('加载失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [planId])

  const handleVoiceInput = async () => {
    if (!recorder.supported) {
      message.warning('当前浏览器不支持语音识别')
      return
    }

    if (isRecording) {
      recorder.stop()
      setIsRecording(false)
      return
    }

    try {
      setIsRecording(true)
      setVoiceText('')
      
      recorder.onResult((text) => {
        setVoiceText(text)
        parseVoiceExpense(text)
      })
      
      recorder.onError((err) => {
        message.error('语音识别失败：' + err)
        setIsRecording(false)
      })
      
      await recorder.start()
    } catch (e) {
      message.error('无法启动语音识别')
      setIsRecording(false)
    }
  }

  const parseVoiceExpense = (text: string) => {
    // 简单的语音解析逻辑
    // 例如："午餐花了120元" -> category: food, amount: 120
    const amountMatch = text.match(/(\d+)元/)
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0

    let category: Expense['category'] = 'other'
    if (text.includes('吃') || text.includes('餐') || text.includes('饭')) {
      category = 'food'
    } else if (text.includes('车') || text.includes('交通') || text.includes('打车')) {
      category = 'transport'
    } else if (text.includes('住') || text.includes('酒店')) {
      category = 'accommodation'
    } else if (text.includes('景点') || text.includes('门票')) {
      category = 'attraction'
    } else if (text.includes('买') || text.includes('购物')) {
      category = 'shopping'
    }

    form.setFieldsValue({
      category,
      amount,
      description: text,
      expense_date: dayjs(),
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      const expense: Expense = {
        plan_id: planId,
        category: values.category,
        amount: values.amount,
        currency: 'CNY',
        description: values.description || '',
        expense_date: dayjs(values.expense_date).format('YYYY-MM-DD'),
      }

      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.id!, expense)
        message.success('更新成功')
      } else {
        await expenseService.addExpense(expense)
        message.success('添加成功')
      }

      setModalVisible(false)
      setEditingExpense(null)
      form.resetFields()
      loadExpenses()
    } catch (e: any) {
      message.error('保存失败：' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await expenseService.deleteExpense(id)
      message.success('删除成功')
      loadExpenses()
    } catch (e: any) {
      message.error('删除失败：' + e.message)
    }
  }

  const categoryMap: Record<string, { text: string; color: string }> = {
    transport: { text: '交通', color: 'blue' },
    accommodation: { text: '住宿', color: 'orange' },
    food: { text: '餐饮', color: 'green' },
    attraction: { text: '景点', color: 'purple' },
    shopping: { text: '购物', color: 'pink' },
    other: { text: '其他', color: 'default' },
  }

  const columns = [
    {
      title: '日期',
      dataIndex: 'expense_date',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      width: 100,
      render: (cat: string) => (
        <Tag color={categoryMap[cat]?.color}>{categoryMap[cat]?.text}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (amount: number) => `¥${amount}`,
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: Expense) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingExpense(record)
              form.setFieldsValue({
                ...record,
                expense_date: dayjs(record.expense_date),
              })
              setModalVisible(true)
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id!)}
          />
        </Space>
      ),
    },
  ]

  const totalSpent = stats?.total || 0
  const remaining = budget - totalSpent
  const spentPercent = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0

  return (
    <div>
      {/* 预算概览 */}
      {budget > 0 && stats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="总预算"
                value={budget}
                prefix="¥"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="已花费"
                value={totalSpent}
                prefix="¥"
                valueStyle={{ color: spentPercent > 100 ? '#ff4d4f' : '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={remaining >= 0 ? '剩余' : '超支'}
                value={Math.abs(remaining)}
                prefix="¥"
                valueStyle={{ color: remaining >= 0 ? '#3f8600' : '#ff4d4f' }}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>预算使用：{spentPercent}%</div>
            <div style={{ background: '#f0f0f0', borderRadius: 4, height: 20, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(spentPercent, 100)}%`,
                  height: '100%',
                  background: spentPercent > 100 ? '#ff4d4f' : spentPercent > 90 ? '#faad14' : '#52c41a',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* 费用列表 */}
      <Card
        title={
          <Space>
            <span>费用记录</span>
            <Tag color="blue">
              {expenses.filter(e => e.itinerary_item_id).length} 条来自行程预估
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SoundOutlined />}
              onClick={handleVoiceInput}
              loading={isRecording}
            >
              {isRecording ? '停止录音' : '语音记账'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingExpense(null)
                form.resetFields()
                setModalVisible(true)
              }}
            >
              添加费用
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f8ff', borderRadius: 4 }}>
          💡 提示：保存行程时已自动根据预估费用创建费用记录，您可以在实际消费后修改或添加新的费用。
        </div>
        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 添加/编辑对话框 */}
      <Modal
        title={editingExpense ? '编辑费用' : '添加费用'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingExpense(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
      >
        {voiceText && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            语音识别：{voiceText}
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="category" label="类别" rules={[{ required: true }]}>
            <Select>
              {Object.entries(categoryMap).map(([key, val]) => (
                <Select.Option key={key} value={key}>
                  {val.text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="expense_date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
