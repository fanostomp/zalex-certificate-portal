import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import NewRequestPage from './pages/NewRequestPage'
import RequestsListPage from './pages/RequestsListPage'
import NotFoundPage from './pages/NotFoundPage'

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
