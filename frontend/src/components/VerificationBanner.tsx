import { useState, useEffect, useRef } from 'react';
import { resendVerification } from '../services/api';

export default function VerificationBanner() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
      timerRef.current = setTimeout(() => setSent(false), 5000);
    } catch {
      // Rate limited or other error — user can try again
    } finally {
      setSending(false);
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
      {sent ? (
        <span style={{ color: 'var(--text-muted)' }}>Sent!</span>
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
