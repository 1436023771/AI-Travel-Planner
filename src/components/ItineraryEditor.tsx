import { useState } from 'react'
import { Card, Button, Modal, Form, Input, Select, TimePicker, InputNumber, message, List, Space } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { planService } from '@/services/planService'
import { sortItineraryItems, calculateNewOrderIndex, recalculateOrderIndexes } from '@/utils/itineraryUtils'
import type { ItineraryItem } from '@/types/plan'

interface ItineraryEditorProps {
  planId: string
  items: ItineraryItem[]
  onUpdate: () => void
}

export const ItineraryEditor = ({ planId, items, onUpdate }: ItineraryEditorProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [reordering, setReordering] = useState(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    try {
      const timeStart = values.time_start ? dayjs(values.time_start).format('HH:mm') : '00:00'
      
      // 计算 order_index
      let orderIndex = 0
      if (!editingItem?.id) {
        // 新增时自动计算位置
        orderIndex = calculateNewOrderIndex(items, values.day, timeStart)
      } else {
        // 编辑时保持原 order_index 或根据时间重新计算
        orderIndex = values.order_index ?? editingItem.order_index ?? 0
      }

      const itemData = {
        plan_id: planId,
        day: values.day,
        type: values.type,
        title: values.title,
        description: values.description || '',
        address: values.address || '',
        time_start: timeStart,
        time_end: values.time_end ? dayjs(values.time_end).format('HH:mm') : null,
        estimated_cost: values.estimated_cost || 0,
        location_lat: values.location_lat || null,
        location_lng: values.location_lng || null,
        order_index: orderIndex,
      }

      if (editingItem?.id) {
        await planService.updateItineraryItem(editingItem.id, itemData)
        if (itemData.estimated_cost > 0) {
          message.success('更新成功，费用记录已同步更新')
        } else {
          message.success('更新成功')
        }
      } else {
        await planService.addItineraryItem(itemData as any)
        if (itemData.estimated_cost > 0) {
          message.success('添加成功，已自动创建费用记录')
        } else {
          message.success('添加成功')
        }
      }

      setModalVisible(false)
      setEditingItem(null)
      form.resetFields()
      
      // 刷新后自动重排序
      onUpdate()
      
      // 延迟一点后再次触发重排序（确保数据已更新）
      setTimeout(() => handleReorder(), 500)
    } catch (e: any) {
      message.error('保存失败：' + e.message)
    }
  }

  // 手动触发重排序
  const handleReorder = async () => {
    try {
      setReordering(true)
      const updates = recalculateOrderIndexes(items)
      if (updates.length > 0) {
        await planService.reorderItineraryItems(updates)
        message.success('行程已按时间重新排序')
        onUpdate()
      }
    } catch (e: any) {
      message.error('重排序失败：' + e.message)
    } finally {
      setReordering(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await planService.deleteItineraryItem(id)
      message.success('删除成功')
      onUpdate()
    } catch (e: any) {
      message.error('删除失败：' + e.message)
    }
  }

  const typeMap: Record<string, string> = {
    transport: '🚗 交通',
    accommodation: '🏨 住宿',
    attraction: '🎯 景点',
    restaurant: '🍴 餐饮',
  }

  // 使用排序工具函数
  const sortedItems = sortItineraryItems(items || [])

  return (
    <div>
      <Card
        title="行程编辑"
        extra={
          <Space>
            <Button
              onClick={handleReorder}
              loading={reordering}
            >
              按时间重排序
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingItem(null)
                form.resetFields()
                setModalVisible(true)
              }}
            >
              添加行程
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
          💡 提示：
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>添加行程项时，如果填写了"预计费用"，系统会自动创建对应的费用记录</li>
            <li>修改行程费用时，关联的费用记录也会同步更新</li>
            <li>删除行程项时，对应的费用记录也会被删除</li>
          </ul>
        </div>
        
        <List
          dataSource={sortedItems}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingItem(item)
                    form.setFieldsValue({
                      ...item,
                      time_start: item.time_start ? dayjs(item.time_start, 'HH:mm') : null,
                      time_end: item.time_end ? dayjs(item.time_end, 'HH:mm') : null,
                    })
                    setModalVisible(true)
                  }}
                >
                  编辑
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(item.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`第${item.day}天 - ${typeMap[item.type]} - ${item.title}`}
                description={
                  <Space direction="vertical" size={4}>
                    <div>{item.description}</div>
                    <div style={{ color: '#999' }}>
                      {item.time_start} - {item.time_end} | {item.address}
                    </div>
                    {item.estimated_cost > 0 && (
                      <div style={{ color: '#fa8c16' }}>¥{item.estimated_cost}</div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑行程' : '添加行程'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingItem(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="day" label="天数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="transport">交通</Select.Option>
              <Select.Option value="accommodation">住宿</Select.Option>
              <Select.Option value="attraction">景点</Select.Option>
              <Select.Option value="restaurant">餐饮</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="time_start" label="开始时间">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="time_end" label="结束时间">
              <TimePicker format="HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="estimated_cost" label="预计费用">
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="location_lat" label="纬度">
              <InputNumber style={{ width: 150 }} step={0.0001} />
            </Form.Item>
            <Form.Item name="location_lng" label="经度">
              <InputNumber style={{ width: 150 }} step={0.0001} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
