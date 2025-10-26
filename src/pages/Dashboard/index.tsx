import { Card, Empty, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>我的旅行计划</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
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
  );
};
