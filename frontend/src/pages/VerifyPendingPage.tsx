import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { resendVerification } from '../services/api';
import { primaryButtonStyle } from '../styles/form';

export default function VerifyPendingPage() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    // Poll for verification status every 5 seconds
    const interval = setInterval(() => refreshUser(), 5000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refreshUser]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_verified) return <Navigate to="/" replace />;

  const handleResend = async () => {
    setSending(true);
    setMessage('');
    try {
      await resendVerification();
      setMessage('Verification email sent!');
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setMessage(status === 429 ? 'Please wait before resending' : 'Failed to send');
    } finally {
      setSending(false);
      timerRef.current = setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
        background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, color: '#0a0a0f',
      }}>
        @
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>
        Verify your email
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.95rem' }}>
        We sent a verification link to
      </p>
      <p style={{ fontWeight: 600, marginBottom: 24, fontSize: '1rem' }}>
        {user.email}
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.85rem' }}>
        Click the link in the email to verify your account and start using CCBenefits.
      </p>

      <button
        onClick={handleResend}
        disabled={sending}
        style={{ ...primaryButtonStyle, width: '100%', padding: '12px', marginBottom: 12 }}
      >
        {sending ? 'Sending...' : 'Resend verification email'}
      </button>

      {message && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>
      )}

      <button
        onClick={logout}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
