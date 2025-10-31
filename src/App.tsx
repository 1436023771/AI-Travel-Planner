import { useState, useEffect } from 'react';
import { Button, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreatePlan } from './pages/CreatePlan';
import { PlanDetail } from './pages/PlanDetail';
import { useAuthStore } from './store/authStore';
import './App.css';

const Home = () => {
  const { user } = useAuthStore();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌍 AI Travel Planner</h1>
        <p>智能旅行规划助手</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <h2>项目初始化成功！</h2>
          <p>✅ 阶段一已完成</p>
          <ul style={{ textAlign: 'left', marginTop: 20 }}>
            <li>✅ React + TypeScript + Vite 项目搭建</li>
            <li>✅ Ant Design UI 组件库集成</li>
            <li>✅ Supabase 认证配置</li>
            <li>✅ 路由系统实现</li>
            <li>✅ 用户认证功能</li>
          </ul>
          {!user && (
            <p style={{ marginTop: 20, color: '#666' }}>
              请先登录或注册以体验完整功能
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="create" element={
              <ProtectedRoute>
                <CreatePlan />
              </ProtectedRoute>
            } />
            <Route path="plan/:id" element={
              <ProtectedRoute>
                <PlanDetail />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
