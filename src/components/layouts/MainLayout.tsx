import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { 
  HomeOutlined, 
  DashboardOutlined, 
  PlusOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import styles from './MainLayout.module.scss';

const { Header, Content, Footer } = Layout;

export const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    ...(user ? [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">我的计划</Link>,
      },
      {
        key: 'create',
        icon: <PlusOutlined />,
        label: <Link to="/create">创建计划</Link>,
      },
    ] : []),
  ];

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <span>🌍 AI Travel Planner</span>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          items={menuItems}
          className={styles.menu}
        />
        <div className={styles.userSection}>
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} className={styles.avatar} />
            </Dropdown>
          ) : (
            <>
              <Button type="text" onClick={() => navigate('/auth/login')}>
                登录
              </Button>
              <Button type="primary" onClick={() => navigate('/auth/register')}>
                注册
              </Button>
            </>
          )}
        </div>
      </Header>
      <Content className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </Content>
      <Footer className={styles.footer}>
        AI Travel Planner ©2024 Created with ❤️
      </Footer>
    </Layout>
  );
};
