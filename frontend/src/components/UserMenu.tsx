import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function UserMenu({ displayName }: { displayName: string }) {
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
          <Link
            to="/admin/feedback"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '8px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            Admin: Feedback
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
