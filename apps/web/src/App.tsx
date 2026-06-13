import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout }       from '@/components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/ProtectedRoute';

// Auth
import LoginPage    from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// App pages
import DashboardPage   from '@/pages/dashboard/DashboardPage';
import GroupsPage      from '@/pages/groups/GroupsPage';
import GroupDetailPage from '@/pages/groups/GroupDetailPage';
import JoinGroupPage   from '@/pages/groups/JoinGroupPage';
import ExpensesPage    from '@/pages/expenses/ExpensesPage';
import SettingsPage    from '@/pages/settings/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes (redirect to /dashboard if logged in) ── */}
        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        {/* ── Public join route (handles invite links) ── */}
        <Route path="/join/:inviteCode" element={<JoinGroupPage />} />

        {/* ── Protected app shell ── */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"         element={<DashboardPage />} />
          <Route path="/groups"            element={<GroupsPage />} />
          <Route path="/groups/:groupId"   element={<GroupDetailPage />} />
          <Route path="/expenses"          element={<ExpensesPage />} />
          <Route path="/settings"          element={<SettingsPage />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
