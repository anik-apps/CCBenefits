import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import AddCard from './pages/AddCard';
import CardDetail from './pages/CardDetail';
import AllCredits from './pages/AllCredits';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import FeedbackModal from './components/FeedbackModal';
import ProtectedRoute from './components/ProtectedRoute';
import AdminFeedback from './pages/AdminFeedback';
import TabLink from './components/TabLink';
import UserMenu from './components/UserMenu';
import { useState } from 'react';

function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isTabPage = location.pathname === '/' || location.pathname === '/credits';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAuthPage && (
        <header style={{
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px)',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: '#0a0a0f',
              fontFamily: 'var(--font-display)',
            }}>
              CC
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}>
              CCBenefits
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isTabPage && (
              <>
                <TabLink to="/" label="Cards" active={location.pathname === '/'} />
                <TabLink to="/credits" label="All Credits" active={location.pathname === '/credits'} />
                <div style={{ width: 1, height: 20, background: 'var(--border-medium)', margin: '0 6px' }} />
              </>
            )}
            <Link to="/add-card" style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
              color: '#0a0a0f',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'opacity 0.2s',
            }}>
              + Add
            </Link>
            {user && (
              <button
                onClick={() => setFeedbackOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Feedback
              </button>
            )}
            {user && <UserMenu displayName={user.display_name} />}
          </div>
        </header>
      )}

      <main style={{ flex: 1, padding: isAuthPage ? '0' : '20px', maxWidth: isAuthPage ? 'none' : 960, width: '100%', margin: '0 auto' }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute><AllCredits /></ProtectedRoute>} />
          <Route path="/add-card" element={<ProtectedRoute><AddCard /></ProtectedRoute>} />
          <Route path="/card/:id" element={<ProtectedRoute><CardDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute><AdminFeedback /></ProtectedRoute>} />
        </Routes>
      </main>
      {user && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

export default App;
