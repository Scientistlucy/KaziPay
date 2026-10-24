import { lazy, Suspense, type ComponentType, type ReactElement } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { PageContainer } from './components/ui/Page'
import { LoadingRegion, Skeleton } from './components/ui/Skeleton'

// Each page is its own chunk, so the sign-in screen doesn't download charts and tables.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })))

const LoginPage = page(() => import('./pages/auth/LoginPage'), 'LoginPage')
const RegisterPage = page(() => import('./pages/auth/RegisterPage'), 'RegisterPage')
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage')
const ClientsPage = page(() => import('./pages/ClientsPage'), 'ClientsPage')
const ClientDetailPage = page(() => import('./pages/ClientDetailPage'), 'ClientDetailPage')
const ProjectsPage = page(() => import('./pages/ProjectsPage'), 'ProjectsPage')
const ProjectDetailPage = page(() => import('./pages/ProjectDetailPage'), 'ProjectDetailPage')
const TimePage = page(() => import('./pages/TimePage'), 'TimePage')
const InvoicesPage = page(() => import('./pages/InvoicesPage'), 'InvoicesPage')
const InvoiceDetailPage = page(() => import('./pages/InvoiceDetailPage'), 'InvoiceDetailPage')
const PaymentsPage = page(() => import('./pages/PaymentsPage'), 'PaymentsPage')
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage')
const NotFoundPage = page(() => import('./pages/NotFoundPage'), 'NotFoundPage')

function PageFallback() {
  return (
    <PageContainer>
      <LoadingRegion label="Loading page" className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80 max-w-full" /></div>
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
        <Skeleton className="h-80 rounded-lg" />
      </LoadingRegion>
    </PageContainer>
  )
}

const withFallback = (element: ReactElement) => <Suspense fallback={<PageFallback />}>{element}</Suspense>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={null}><RegisterPage /></Suspense>} />
      <Route element={<AppShell />}>
        <Route index element={withFallback(<DashboardPage />)} />
        <Route path="clients" element={withFallback(<ClientsPage />)} />
        <Route path="clients/:clientId" element={withFallback(<ClientDetailPage />)} />
        <Route path="projects" element={withFallback(<ProjectsPage />)} />
        <Route path="projects/:projectId" element={withFallback(<ProjectDetailPage />)} />
        <Route path="time" element={withFallback(<TimePage />)} />
        <Route path="invoices" element={withFallback(<InvoicesPage />)} />
        <Route path="invoices/:invoiceId" element={withFallback(<InvoiceDetailPage />)} />
        <Route path="payments" element={withFallback(<PaymentsPage />)} />
        <Route path="settings" element={withFallback(<SettingsPage />)} />
        <Route path="*" element={withFallback(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}
