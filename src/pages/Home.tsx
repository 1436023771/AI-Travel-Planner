import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Tabs, message, Space, Alert, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { 
  KeyOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { configManager } from '@/utils/configManager'
import { useAuthStore } from '@/store/authStore'
import { migrateEnvToSupabase } from '@/utils/migrateEnvToSupabase'
import './Home.css'

interface ApiKeys {
  supabaseUrl: string
  supabaseKey: string
  baichuanEndpoint: string
  baichuanKey: string
  baichuanModel: string
  amapKey: string
}

export const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [configStatus, setConfigStatus] = useState({
    supabase: false,
    llm: false,
    map: false,
  })
  const [migrating, setMigrating] = useState(false)

  // 从配置管理器加载配置
  useEffect(() => {
    const loadConfig = async () => {
      if (user) {
        setMigrating(true)
        await migrateEnvToSupabase(user.id)
        setMigrating(false)
        await configManager.loadUserConfig(user.id)
      }
      const config = configManager.getForDisplay()
      form.setFieldsValue({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        baichuanEndpoint: config.baichuanEndpoint,
        baichuanKey: config.baichuanKey,
        baichuanModel: config.baichuanModel,
        amapKey: config.amapKey,
      })
      checkConfigStatus(config)
    }

    loadConfig()
  }, [user])

  const checkConfigStatus = (config: any) => {
    setConfigStatus({
      supabase: !!(config.supabaseUrl && config.supabaseKey),
      llm: !!(config.baichuanKey || config.openaiKey),
      map: !!config.amapKey,
    })
  }

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      if (user) {
        // 已登录：保存到 Supabase
        await configManager.saveToSupabase(user.id, {
          baichuanEndpoint: values.baichuanEndpoint,
          baichuanKey: values.baichuanKey,
          baichuanModel: values.baichuanModel,
          amapKey: values.amapKey,
        })
        
        message.success({
          content: '配置已保存到云端并立即生效！',
          duration: 3,
        })
      } else {
        // 未登录：提示需要登录
        message.warning('请先登录后才能保存配置到云端')
        setTimeout(() => navigate('/login'), 1500)
        return
      }
      
      const updatedConfig = configManager.getForDisplay()
      checkConfigStatus(updatedConfig)
    } catch (e: any) {
      message.error('保存失败：' + (e.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    setLoading(true)
    try {
      await configManager.clearUserConfig(user.id)
      const config = configManager.getForDisplay()
      form.setFieldsValue({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        baichuanEndpoint: config.baichuanEndpoint,
        baichuanKey: config.baichuanKey,
        baichuanModel: config.baichuanModel,
        amapKey: config.amapKey,
      })
      message.success('已清除云端配置，恢复使用环境变量')
      checkConfigStatus(config)
    } catch (e: any) {
      message.error('清除失败：' + (e.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  const allConfigured = configStatus.supabase && configStatus.llm && configStatus.map

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>🌍 AI Travel Planner</h1>
        <p className="hero-subtitle">智能旅行规划助手 - 让 AI 为您规划完美旅程</p>
        
        {user && allConfigured && (
          <Button 
            type="primary" 
            size="large" 
            icon={<RocketOutlined />}
            onClick={() => navigate('/create')}
            style={{ marginTop: 20 }}
          >
            开始创建旅行计划
          </Button>
        )}
      </div>

      <div className="home-content">
        {/* 迁移中提示 */}
        {migrating && (
          <Alert
            message="正在迁移配置..."
            description="正在将环境变量中的配置迁移到云端，请稍候。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 配置状态概览 */}
        <Card className="status-card" style={{ marginBottom: 24 }}>
          <h3>
            <SettingOutlined /> 服务配置状态
          </h3>
          <Space size="large" style={{ marginTop: 16 }}>
            <div>
              {configStatus.supabase ? (
                <Tag icon={<CheckCircleOutlined />} color="success">Supabase 已配置</Tag>
              ) : (
                <Tag icon={<ExclamationCircleOutlined />} color="warning">Supabase 未配置</Tag>
              )}
            </div>
            <div>
              {configStatus.llm ? (
                <Tag icon={<CheckCircleOutlined />} color="success">AI 模型已配置</Tag>
              ) : (
                <Tag icon={<ExclamationCircleOutlined />} color="warning">AI 模型未配置</Tag>
              )}
            </div>
            <div>
              {configStatus.map ? (
                <Tag icon={<CheckCircleOutlined />} color="success">地图服务已配置</Tag>
              ) : (
                <Tag icon={<ExclamationCircleOutlined />} color="warning">地图服务未配置</Tag>
              )}
            </div>
          </Space>
          
          {!allConfigured && (
            <Alert
              message="请完成 API 密钥配置"
              description="在使用完整功能前，需要配置必要的服务密钥。请在下方表单中填写您的 API 密钥。"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* API 配置表单 */}
        <Card>
          <h3>
            <KeyOutlined /> API 密钥配置
          </h3>
          
          {!user && (
            <Alert
              message="需要登录"
              description="配置将保存到云端，支持跨设备同步。请先登录后再配置。"
              type="warning"
              showIcon
              action={
                <Button type="primary" onClick={() => navigate('/login')}>
                  立即登录
                </Button>
              }
              style={{ marginBottom: 24 }}
            />
          )}

          <Alert
            message="配置说明"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>配置将加密保存到云端 Supabase，支持跨设备同步</li>
                <li>只会保存您填写的字段，未填写的字段继续使用环境变量</li>
                <li>与环境变量相同的值不会保存（避免冗余）</li>
                <li>修改配置后立即生效，无需刷新页面</li>
              </ul>
            }
            type="info"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Tabs
              items={[
                {
                  key: 'llm',
                  label: 'AI 模型配置',
                  children: (
                    <>
                      <h4>阿里百炼</h4>
                      <Form.Item name="baichuanEndpoint" label="API 端点">
                        <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" />
                      </Form.Item>
                      <Form.Item name="baichuanKey" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
                        <Input.Password placeholder="sk-..." />
                      </Form.Item>
                      <Form.Item name="baichuanModel" label="模型名称">
                        <Input placeholder="qwen-turbo" />
                      </Form.Item>

                      <Alert
                        message="如何获取？"
                        description={
                          <div>
                            1. 访问 <a href="https://dashscope.aliyun.com" target="_blank" rel="noopener noreferrer">阿里云百炼</a><br/>
                            2. 创建 API Key<br/>
                            3. 选择模型：qwen-turbo (快速) / qwen-plus (平衡) / qwen-max (最强)<br/>
                            4. 复制 API Key 到上方输入框
                          </div>
                        }
                        type="info"
                      />
                    </>
                  ),
                },
                {
                  key: 'map',
                  label: '地图服务',
                  children: (
                    <>
                      <Form.Item name="amapKey" label="高德地图 API Key" rules={[{ required: true, message: '请输入高德地图 Key' }]}>
                        <Input placeholder="输入您的高德地图 Key" />
                      </Form.Item>
                      <Alert
                        message="如何获取？"
                        description={
                          <div>
                            1. 访问 <a href="https://console.amap.com" target="_blank" rel="noopener noreferrer">高德开放平台</a><br/>
                            2. 注册/登录账号<br/>
                            3. 创建应用 → 添加 Key → 选择 "Web端(JS API)"<br/>
                            4. 复制 Key 到上方输入框
                          </div>
                        }
                        type="info"
                      />
                    </>
                  ),
                },
              ]}
            />

            <Form.Item style={{ marginTop: 24 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading} disabled={!user}>
                  {user ? '保存配置' : '请先登录'}
                </Button>
                <Button onClick={handleClear} disabled={!user}>
                  清除配置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 功能介绍 */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 32 }}>核心功能</h2>
          <div className="features-grid">
            <Card className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>AI 智能规划</h3>
              <p>基于 AI 大语言模型，根据您的需求自动生成个性化旅行路线</p>
            </Card>
            <Card className="feature-card">
              <div className="feature-icon">🎤</div>
              <h3>语音交互</h3>
              <p>支持语音输入旅行需求和费用记录，解放双手更便捷</p>
            </Card>
            <Card className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>地图可视化</h3>
              <p>在地图上直观查看行程路线，支持导航和周边搜索</p>
            </Card>
            <Card className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>预算管理</h3>
              <p>AI 智能预算分析，实时追踪旅行开销，费用透明可控</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
