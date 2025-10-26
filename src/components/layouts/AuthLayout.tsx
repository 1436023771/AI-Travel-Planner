import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import styles from './AuthLayout.module.scss';

const { Content } = Layout;

export const AuthLayout = () => {
  return (
    <Layout className={styles.layout}>
      <Content className={styles.content}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <h1>🌍 AI Travel Planner</h1>
            <p>智能规划您的完美旅程</p>
          </div>
          <div className={styles.formContainer}>
            <Outlet />
          </div>
        </div>
      </Content>
    </Layout>
  );
};
