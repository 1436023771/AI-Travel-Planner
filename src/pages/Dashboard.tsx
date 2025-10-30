import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Empty, Button, List, Tag, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EyeOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { planService } from '@/services/planService'
import type { TravelPlan } from '@/types/plan'
import './Dashboard.css'

export const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlans = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await planService.getUserPlans(user.id)
      setPlans(data)
    } catch (e: any) {
      message.error('加载失败：' + (e.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [user])

  const handleDelete = async (id: string) => {
    try {
      await planService.deletePlan(id)
      message.success('删除成功')
      loadPlans()
    } catch (e: any) {
      message.error('删除失败：' + (e.message || String(e)))
    }
  }

  const getStatusTag = (status: string) => {
    const config = {
      draft: { color: 'default', text: '草稿' },
      active: { color: 'blue', text: '进行中' },
      completed: { color: 'green', text: '已完成' },
    }
    const { color, text } = config[status as keyof typeof config] || config.draft
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>我的旅行计划</h1>
          <p className="user-email">欢迎，{user?.email}</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/create')}
          size="large"
        >
          创建新计划
        </Button>
      </div>
      
      {loading ? (
        <Card loading />
      ) : plans.length === 0 ? (
        <Card>
          <Empty 
            description="暂无旅行计划"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/create')}>
              创建第一个计划
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
          dataSource={plans}
          renderItem={(plan) => (
            <List.Item>
              <Card
                hoverable
                className="plan-card"
                actions={[
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    查看
                  </Button>,
                  <Popconfirm
                    title="确定删除此计划？"
                    onConfirm={() => handleDelete(plan.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <div className="plan-card-header">
                  <h3>{plan.title || plan.destination}</h3>
                  {getStatusTag(plan.status)}
                </div>
                <div className="plan-card-body">
                  <p className="destination">📍 {plan.destination}</p>
                  <p className="dates">
                    <CalendarOutlined /> {plan.start_date} → {plan.end_date}
                  </p>
                  <Space className="plan-meta">
                    <span>👥 {plan.travelers} 人</span>
                    {plan.budget && <span>💰 ¥{plan.budget}</span>}
                  </Space>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  )
}
