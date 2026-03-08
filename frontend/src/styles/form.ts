import type { CSSProperties } from 'react';

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};

export const primaryButtonStyle: CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--radius-sm)',
  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
  color: '#0a0a0f',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

export const errorStyle: CSSProperties = {
  color: 'var(--status-danger)',
  marginBottom: 16,
  fontSize: '0.9rem',
};

export const authPageStyle: CSSProperties = {
  maxWidth: 400,
  margin: '80px auto',
  padding: 24,
};
