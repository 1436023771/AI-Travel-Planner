import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Auth/Login';
import { Register } from '@/pages/Auth/Register';
import { Dashboard } from '@/pages/Dashboard';
import { CreatePlan } from '@/pages/CreatePlan';
import { PlanDetail } from '@/pages/PlanDetail';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <CreatePlan />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:id',
        element: (
          <ProtectedRoute>
            <PlanDetail />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
