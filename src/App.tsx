import { useState } from 'react';
import { Button, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        <header className="app-header">
          <h1>🌍 AI Travel Planner</h1>
          <p>智能旅行规划助手</p>
        </header>
        
        <main className="app-main">
          <div className="card">
            <h2>项目初始化成功！</h2>
            <p>阶段一：基础搭建</p>
            <Button 
              type="primary" 
              size="large"
              onClick={() => setCount((count) => count + 1)}
            >
              点击次数: {count}
            </Button>
          </div>

          <div className="info">
            <h3>✅ 已完成</h3>
            <ul>
              <li>React + TypeScript + Vite 项目搭建</li>
              <li>Ant Design UI 组件库集成</li>
              <li>项目基础配置完成</li>
            </ul>
            
            <h3>🚧 下一步</h3>
            <ul>
              <li>配置 Supabase</li>
              <li>实现路由系统</li>
              <li>创建用户认证</li>
            </ul>
          </div>
        </main>
      </div>
    </ConfigProvider>
  )
}

export default App
