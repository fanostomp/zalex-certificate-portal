import { Navigate, Route, Routes } from 'react-router'
import { lazy } from 'react'
import AppLayout from './components/layout/AppLayout'

const NewRequestPage = lazy(() => import('./pages/NewRequestPage'))
const RequestsListPage = lazy(() => import('./pages/RequestsListPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/requests/new" replace />} />
        <Route path="/requests/new" element={<NewRequestPage />} />
        <Route path="/requests" element={<RequestsListPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
