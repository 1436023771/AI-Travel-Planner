import { Button, Row, Col, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  RocketOutlined, 
  ThunderboltOutlined, 
  SafetyOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import styles from './index.module.scss';

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const features = [
    {
      icon: <RocketOutlined />,
      title: 'AI 智能规划',
      description: '基于 AI 技术，秒速生成个性化旅行路线',
    },
    {
      icon: <ThunderboltOutlined />,
      title: '语音交互',
      description: '支持语音输入需求，解放双手更便捷',
    },
    {
      icon: <SafetyOutlined />,
      title: '预算管理',
      description: 'AI 智能预算分析，费用透明可控',
    },
    {
      icon: <GlobalOutlined />,
      title: '云端同步',
      description: '多设备同步，随时随地查看计划',
    },
  ];

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1>开启您的智能旅行规划</h1>
        <p>让 AI 帮您规划完美旅程，省时省心</p>
        <div className={styles.actions}>
          {user ? (
            <Button 
              type="primary" 
              size="large" 
              onClick={() => navigate('/create')}
            >
              立即创建计划
            </Button>
          ) : (
            <>
              <Button 
                type="primary" 
                size="large" 
                onClick={() => navigate('/auth/register')}
              >
                免费开始
              </Button>
              <Button 
                size="large" 
                onClick={() => navigate('/auth/login')}
              >
                登录
              </Button>
            </>
          )}
        </div>
      </section>

      <section className={styles.features}>
        <h2>核心功能</h2>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card className={styles.featureCard}>
                <div className={styles.icon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </div>
  );
};
