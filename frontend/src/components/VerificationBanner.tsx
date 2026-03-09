import { useState, useEffect, useRef } from 'react';
import { resendVerification } from '../services/api';

export default function VerificationBanner() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleResend = async () => {
    setSending(true);
    setMessage('');
    try {
      await resendVerification();
      setMessage('Sent!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMessage(status === 429 ? 'Please wait before resending' : 'Failed to send');
    } finally {
      setSending(false);
      timerRef.current = setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div style={{
      padding: '10px 24px',
      background: 'rgba(201, 168, 76, 0.12)',
      borderBottom: '1px solid rgba(201, 168, 76, 0.3)',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      position: 'sticky',
      top: 61,
      zIndex: 99,
      backdropFilter: 'blur(20px)',
    }}>
      <span style={{ color: 'var(--accent-gold)' }}>
        Please verify your email. Check your inbox.
      </span>
      {message ? (
        <span style={{ color: 'var(--text-muted)' }}>{message}</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-gold)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: 0,
          }}
        >
          {sending ? 'Sending...' : 'Resend email'}
        </button>
      )}
    </div>
  );
}
