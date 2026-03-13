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
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPendingPage from './pages/VerifyPendingPage';
import TabLink from './components/TabLink';
import UserMenu from './components/UserMenu';
import NotificationPanel from './components/NotificationPanel';
import { useState } from 'react';
import appIcon from './assets/app-icon.png';

function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isTabPage = location.pathname === '/' || location.pathname === '/credits';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/verify-pending';
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('ccb-splash-shown'));

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundImage: `url(${appIcon})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: '40%',
      backgroundAttachment: 'fixed',
    }}>
      {/* Overlay to dim the watermark */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'rgba(10, 10, 15, 0.92)',
      }} />
      {showSplash && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'var(--bg-primary)',
            animation: 'splashOverlayFade 6s ease-out forwards',
          }}
          onAnimationEnd={() => {
            setShowSplash(false);
            sessionStorage.setItem('ccb-splash-shown', 'true');
          }}
        >
          <img
            src={appIcon}
            width={200}
            height={200}
            style={{
              position: 'fixed', top: 0, left: 0,
              transformOrigin: 'top left',
              animation: 'splashToHeader 6s ease-out forwards',
              borderRadius: 24,
            }}
            alt=""
          />
        </div>
      )}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        ...(showSplash ? { opacity: 0, animation: 'contentFadeIn 1.5s ease-out 4.5s forwards' } : {}),
        backdropFilter: 'blur(20px)',
      }}>
        <Link to={user ? '/' : '/login'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={appIcon} width={32} height={32} style={{ borderRadius: 6 }} alt="CCBenefits" />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}>
            <span style={{ color: 'var(--accent-gold)' }}>CCB</span>
            <span style={{ color: '#c0c0d0' }}>enefits</span>
          </span>
        </Link>

        {!isAuthPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isTabPage && (
              <div className="desktop-tabs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TabLink to="/" label="Cards" active={location.pathname === '/'} />
                <TabLink to="/credits" label="All Credits" active={location.pathname === '/credits'} />
                <div style={{ width: 1, height: 20, background: 'var(--border-medium)', margin: '0 6px' }} />
              </div>
            )}
            {user && <NotificationPanel />}
            {user && <UserMenu displayName={user.display_name} isAdmin={user.is_admin} />}
          </div>
        )}
      </header>
      <main style={{
        flex: 1, padding: '20px', maxWidth: isAuthPage ? 480 : 960, width: '100%', margin: '0 auto',
        position: 'relative', zIndex: 1,
        ...(showSplash ? { opacity: 0, animation: 'contentFadeIn 1.5s ease-out 4.5s forwards' } : {}),
      }}>
        <Routes>
          <Route path="/login" element={user && user.is_verified ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user && user.is_verified ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/verify" element={<VerifyEmailPage />} />
          <Route path="/verify-pending" element={<VerifyPendingPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute><AllCredits /></ProtectedRoute>} />
          <Route path="/add-card" element={<ProtectedRoute><AddCard /></ProtectedRoute>} />
          <Route path="/card/:id" element={<ProtectedRoute><CardDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute><AdminFeedback /></ProtectedRoute>} />
        </Routes>
      </main>
      {user && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}

      {/* Floating action buttons */}
      {user && !isAuthPage && (
        <>
          <button
            onClick={() => setFeedbackOpen(true)}
            style={{
              position: 'fixed',
              bottom: 24,
              left: 24,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 90,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
            title="Send feedback"
          >
            💬
          </button>
          <Link
            to="/add-card"
            style={{
              position: 'fixed',
              bottom: 'clamp(24px, 4vh, 40px)',
              right: 'clamp(32px, 5vw, 80px)',
              width: 'clamp(56px, 6vw, 72px)',
              height: 'clamp(56px, 6vw, 72px)',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
              color: '#0a0a0f',
              fontSize: 'clamp(28px, 3vw, 36px)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              zIndex: 90,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'; }}
            title="Add a card"
          >
            +
          </Link>
        </>
      )}
    </div>
  );
}

export default App;
