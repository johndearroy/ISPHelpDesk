import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { AiUsagePage } from './pages/AiUsagePage'
import { CategoriesPage } from './pages/CategoriesPage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { LoginPage } from './pages/LoginPage'
import { NewTicketPage } from './pages/NewTicketPage'
import { CrashPage, NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketListPage } from './pages/TicketListPage'

export const router = createBrowserRouter([
  {
    errorElement: <CrashPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/tickets', element: <TicketListPage /> },
          { path: '/tickets/new', element: <NewTicketPage /> },
          { path: '/tickets/:id', element: <TicketDetailPage /> },
          {
            path: '/incidents',
            element: (
              <ProtectedRoute roles={['AGENT', 'ADMIN']}>
                <IncidentsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/incidents/:id',
            element: (
              <ProtectedRoute roles={['AGENT', 'ADMIN']}>
                <IncidentDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/ai-usage',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <AiUsagePage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/categories',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <CategoriesPage />
              </ProtectedRoute>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
