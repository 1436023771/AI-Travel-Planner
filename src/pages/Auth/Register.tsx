import { Form, Input, Button, Alert } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import type { RegisterCredentials } from '@/types/auth';
import styles from './Auth.module.scss';

export const Register = () => {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();
  const [form] = Form.useForm();

  const handleSubmit = async (values: RegisterCredentials) => {
    try {
      clearError();
      await register(values);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className={styles.authForm}>
      <h2>注册</h2>
      <p className={styles.subtitle}>创建您的账号</p>
      
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
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少 6 位' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="确认密码"
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
            注册
          </Button>
        </Form.Item>
      </Form>

      <div className={styles.links}>
        <span>已有账号？</span>
        <Link to="/auth/login">立即登录</Link>
      </div>
    </div>
  );
};
