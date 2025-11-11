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
import { Home } from './pages/Home';
import './App.css';
import { configManager } from './utils/configManager';
import { migrateEnvToSupabase } from './utils/migrateEnvToSupabase';

function App() {
  const { checkAuth, user } = useAuthStore()

  useEffect(() => {
    configManager.init()
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (user) {
      migrateEnvToSupabase(user.id).then(migrated => {
        // 始终从 Supabase 加载最新配置（无论是否迁移）
        configManager.loadUserConfig(user.id)
      })
    }
  }, [user])

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
