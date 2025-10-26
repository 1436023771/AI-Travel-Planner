import { Form, Input, Button, Alert } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import type { LoginCredentials } from '@/types/auth';
import styles from './Auth.module.scss';

export const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      clearError();
      await login(values);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className={styles.authForm}>
      <h2>登录</h2>
      <p className={styles.subtitle}>欢迎回来！</p>
      
      {error && (
        <Alert 
          message={error} 
          type="error" 
          closable 
          onClose={clearError}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="邮箱" 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large"
            loading={loading}
          >
            登录
          </Button>
        </Form.Item>
      </Form>

      <div className={styles.links}>
        <span>还没有账号？</span>
        <Link to="/auth/register">立即注册</Link>
      </div>
    </div>
  );
};
