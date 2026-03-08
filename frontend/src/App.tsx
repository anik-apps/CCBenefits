import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import AddCard from './pages/AddCard';
import CardDetail from './pages/CardDetail';
import AllCredits from './pages/AllCredits';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import { useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isTabPage = location.pathname === '/' || location.pathname === '/credits';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

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
            {user && <UserMenu displayName={user.display_name} />}
          </div>
        </header>
      )}

      <main style={{ flex: 1, padding: isAuthPage ? '0' : '20px', maxWidth: isAuthPage ? 'none' : 960, width: '100%', margin: '0 auto' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute><AllCredits /></ProtectedRoute>} />
          <Route path="/add-card" element={<ProtectedRoute><AddCard /></ProtectedRoute>} />
          <Route path="/card/:id" element={<ProtectedRoute><CardDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function TabLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </Link>
  );
}

function UserMenu({ displayName }: { displayName: string }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', marginLeft: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-primary)',
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}
      >
        {displayName}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 4,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          minWidth: 140,
          zIndex: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '8px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
            }}
          >
            Profile
          </Link>
          <button
            onClick={() => { setOpen(false); logout(); }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              fontSize: '0.85rem',
              color: 'var(--status-danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
