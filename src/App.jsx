import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Groups from './pages/Groups';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Expenses from './pages/Expenses';
import StudentAttendance from './pages/StudentAttendance';
import StudentPayments from './pages/StudentPayments';
import SendNotification from './pages/SendNotification';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<ProtectedRoute allowedRoles={['admin', 'owner', 'teacher']}><Students /></ProtectedRoute>} />
          <Route path="groups" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><Groups /></ProtectedRoute>} />
          <Route path="attendance" element={<ProtectedRoute allowedRoles={['admin', 'owner', 'teacher']}><Attendance /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><Payments /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><Expenses /></ProtectedRoute>} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><Users /></ProtectedRoute>} />
          {/* Student-specific routes */}
          <Route path="student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendance /></ProtectedRoute>} />
          <Route path="student/payments" element={<ProtectedRoute allowedRoles={['student']}><StudentPayments /></ProtectedRoute>} />
          {/* Admin/Teacher notification sender */}
          <Route path="notifications/send" element={<ProtectedRoute allowedRoles={['admin', 'owner', 'teacher']}><SendNotification /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
