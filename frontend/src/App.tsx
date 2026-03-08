import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AddCard from './pages/AddCard';
import CardDetail from './pages/CardDetail';
import AllCredits from './pages/AllCredits';

function App() {
  const location = useLocation();
  const isTabPage = location.pathname === '/' || location.pathname === '/credits';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
        </div>
      </header>

      <main style={{ flex: 1, padding: '20px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/credits" element={<AllCredits />} />
          <Route path="/add-card" element={<AddCard />} />
          <Route path="/card/:id" element={<CardDetail />} />
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

export default App;
