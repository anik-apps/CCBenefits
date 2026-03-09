import { Link } from 'react-router-dom';

export default function TabLink({ to, label, active }: { to: string; label: string; active: boolean }) {
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
