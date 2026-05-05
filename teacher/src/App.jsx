import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { AuthProvider } from './shared/context/AuthContext';
import { SocketProvider } from './shared/context/SocketContext';
import { ToastProvider } from './shared/context/ToastContext';
import { NotificationProvider } from './shared/context/NotificationContext';
import { ToastContainer } from './shared/components/Toast';
import Login from './pages/Login';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ParentManagement from './pages/ParentManagement';
import Activities from './pages/Activities';
import Meals from './pages/Meals';
import Media from './pages/Media';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import MonitoringJournal from './pages/MonitoringJournal';
import TherapyManagement from './pages/TherapyManagement';
import ParentApp from './parent/ParentApp';
import ParentDashboard from './parent/pages/Dashboard';
import ChildProfile from './parent/pages/ChildProfile';
import ParentActivities from './parent/pages/Activities';
import ParentMeals from './parent/pages/Meals';
import ParentMedia from './parent/pages/Media';
import ParentChat from './parent/pages/Chat';
import Notifications from './parent/pages/Notifications';
import Help from './parent/pages/Help';
import AIChat from './parent/pages/AIChat';
import TeacherRating from './parent/pages/TeacherRating';
import ParentSettings from './parent/pages/Settings';
import Therapy from './parent/pages/Therapy';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <NotificationProvider>
          <AuthProvider>
            <SocketProvider>
              <Router>
                <ToastContainer />
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute requireRole="parent">
                        <ParentApp />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ErrorBoundary><ParentDashboard /></ErrorBoundary>} />
                    <Route path="child" element={<ErrorBoundary><ChildProfile /></ErrorBoundary>} />
                    <Route path="activities" element={<ErrorBoundary><ParentActivities /></ErrorBoundary>} />
                    <Route path="meals" element={<ErrorBoundary><ParentMeals /></ErrorBoundary>} />
                    <Route path="media" element={<ErrorBoundary><ParentMedia /></ErrorBoundary>} />
                    <Route path="ai-chat" element={<ErrorBoundary><AIChat /></ErrorBoundary>} />
                    <Route path="chat" element={<ErrorBoundary><ParentChat /></ErrorBoundary>} />
                    <Route path="notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
                    <Route path="help" element={<ErrorBoundary><Help /></ErrorBoundary>} />
                    <Route path="rating" element={<ErrorBoundary><TeacherRating /></ErrorBoundary>} />
                    <Route path="settings" element={<ErrorBoundary><ParentSettings /></ErrorBoundary>} />
                    <Route path="therapy" element={<ErrorBoundary><Therapy /></ErrorBoundary>} />
                  </Route>

                  <Route
                    path="/teacher"
                    element={
                      <ProtectedRoute requireRole="teacher">
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="parents" element={<ErrorBoundary><ParentManagement /></ErrorBoundary>} />
                    <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
                    <Route path="activities" element={<ErrorBoundary><Activities /></ErrorBoundary>} />
                    <Route path="meals" element={<ErrorBoundary><Meals /></ErrorBoundary>} />
                    <Route path="media" element={<ErrorBoundary><Media /></ErrorBoundary>} />
                    <Route path="chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
                    <Route path="monitoring" element={<ErrorBoundary><MonitoringJournal /></ErrorBoundary>} />
                    <Route path="therapy" element={<ErrorBoundary><TherapyManagement /></ErrorBoundary>} />
                    <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Router>
            </SocketProvider>
          </AuthProvider>
        </NotificationProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
