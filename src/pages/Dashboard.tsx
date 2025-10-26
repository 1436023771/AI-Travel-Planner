import { Card, Empty, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

export const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h1 style={{ margin: 0 }}>我的旅行计划</h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            欢迎，{user?.email}
          </p>
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
    </div>
  )
}
