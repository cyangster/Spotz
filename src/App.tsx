import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GroupMapPage } from './pages/GroupMapPage'
import { GroupMembersPage } from './pages/GroupMembersPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/group/:id"
        element={
          <ProtectedRoute>
            <GroupMapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/group/:id/members"
        element={
          <ProtectedRoute>
            <GroupMembersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
